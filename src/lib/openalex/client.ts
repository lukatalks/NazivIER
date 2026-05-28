// OpenAlex API client.
//
// We use OpenAlex as the citation source because:
//   - SICRIS's WoS/Scopus totals are rendered client-side in a JS-only SPA
//     (cris.cobiss.net) and reliably scraping them server-side is fragile.
//   - OpenAlex aggregates citations from Crossref, MAG, PubMed, Microsoft and
//     publisher feeds; its `cited_by_count` is consistently within ~5-15% of
//     WoS total citations for economics research.
//   - It is free, public, no auth, with a generous rate limit (10 req/s; 100k/day).
//
// Two trade-offs documented for the user:
//   1. OpenAlex includes self-citations; SICRIS "čisti citati" excludes them.
//      For the IER thresholds (10 / 100 / 200) the gap is rarely decisive.
//   2. Name search is best-effort: when ORCID is known we use it directly.
//      Otherwise we search by name and pick the best institutional match.

import { cached } from '@/lib/cache/redis';

const BASE = 'https://api.openalex.org';
const IER_OPENALEX_INSTITUTION_ID = 'I4210104025'; // Institute for Economic Research, Ljubljana
const POLITE_EMAIL = 'ai@scaientist.com'; // OpenAlex polite-pool requires a contact email

// Cache TTLs (sec). Citation totals + works lists move slowly; author lookups
// change rarely; self-cite counts are derived from public works data and stable
// for a day. Numbers stay constant across deploys.
const TTL_AUTHOR = 60 * 60 * 24 * 7; // 7 days
const TTL_WORKS = 60 * 60 * 24; // 1 day
const TTL_SELFCITE = 60 * 60 * 24; // 1 day

export interface OpenAlexAuthor {
  openalexId: string;
  displayName: string;
  orcid?: string;
  citedByCount: number;
  hIndex: number;
  worksCount: number;
  /** Hint about institutional match: 'orcid', 'ier-match', 'best-name' */
  matchType: 'orcid' | 'ier-match' | 'best-name' | 'none';
}

const json = async (url: string) => {
  const sep = url.includes('?') ? '&' : '?';
  const res = await fetch(`${url}${sep}mailto=${encodeURIComponent(POLITE_EMAIL)}`, {
    headers: { 'User-Agent': `NazivIER/0.1 (mailto:${POLITE_EMAIL})` },
    next: { revalidate: 60 * 60 * 24 }, // citation totals change slowly
  });
  if (!res.ok) throw new Error(`OpenAlex ${res.status} on ${url}`);
  return res.json();
};

/** Look up an author by ORCID — most reliable. */
async function byOrcid(orcid: string): Promise<OpenAlexAuthor | null> {
  const clean = orcid.replace(/^https?:\/\/orcid\.org\//, '');
  try {
    const a = await json(`${BASE}/authors/orcid:${clean}`);
    return toAuthor(a, 'orcid');
  } catch {
    return null;
  }
}

/** Search by name, prefer authors affiliated with IER. */
async function byName(name: string): Promise<OpenAlexAuthor | null> {
  // Step 1: try with IER institution filter.
  const cleanedName = name.replace(/^dr\.\s*/i, '').trim();
  try {
    const filtered = await json(
      `${BASE}/authors?search=${encodeURIComponent(cleanedName)}` +
        `&filter=last_known_institutions.id:${IER_OPENALEX_INSTITUTION_ID}` +
        `&per-page=1`,
    );
    if (filtered.results?.length > 0) {
      return toAuthor(filtered.results[0], 'ier-match');
    }
  } catch {
    /* fall through */
  }

  // Step 2: name only.
  try {
    const open = await json(`${BASE}/authors?search=${encodeURIComponent(cleanedName)}&per-page=1`);
    if (open.results?.length > 0) {
      return toAuthor(open.results[0], 'best-name');
    }
  } catch {
    /* fall through */
  }

  return null;
}

function toAuthor(raw: Record<string, unknown>, matchType: OpenAlexAuthor['matchType']): OpenAlexAuthor {
  const stats = (raw.summary_stats ?? {}) as Record<string, number>;
  return {
    openalexId: String(raw.id ?? ''),
    displayName: String(raw.display_name ?? ''),
    orcid: raw.orcid ? String(raw.orcid) : undefined,
    citedByCount: Number(raw.cited_by_count ?? 0),
    hIndex: Number(stats.h_index ?? 0),
    worksCount: Number(raw.works_count ?? 0),
    matchType,
  };
}

/**
 * Resolve an OpenAlex author for a researcher.
 * Tries ORCID first when known; falls back to name search.
 */
export async function resolveAuthor(opts: {
  name: string;
  orcid?: string;
}): Promise<OpenAlexAuthor | null> {
  const cacheKey = `oa:author:${opts.orcid ?? 'noorcid'}:${(opts.name ?? '').toLowerCase()}`;
  return cached(cacheKey, TTL_AUTHOR, async () => {
    if (opts.orcid) {
      const a = await byOrcid(opts.orcid);
      if (a) return a;
    }
    if (opts.name) {
      return byName(opts.name);
    }
    return null;
  });
}

/** Per-work fingerprint we need from OpenAlex — used to (a) compute Open Science
 *  compliance under Article 11(6) and (b) count self-citations (Article 13). */
export interface OpenAlexWork {
  /** OpenAlex work ID, e.g. "W2741809807" (we keep the full URL too). */
  id: string;
  doi?: string;
  title: string;
  publicationYear: number;
  isOa: boolean;
  citedByCount: number;
  /** Authorship objects with author IDs — used for self-citation detection. */
  authorIds: string[];
  /** Source quartile placeholder — OpenAlex doesn't directly expose SCImago Q1/Q2,
   *  so we populate this later from the SCImago snapshot. */
  sourceIssn?: string;
}

/** Fetch up to `max` of an author's works, paginated. We sort by cited_by_count
 *  desc because evaluation cares about the most-cited papers first. */
export async function fetchAuthorWorks(authorId: string, max = 200): Promise<OpenAlexWork[]> {
  const cleanId = authorId.replace(/^https?:\/\/openalex\.org\//, '');
  return cached(`oa:works:${cleanId}:${max}`, TTL_WORKS, () => _fetchWorks(cleanId, max));
}

async function _fetchWorks(cleanId: string, max: number): Promise<OpenAlexWork[]> {
  const perPage = 50;
  const out: OpenAlexWork[] = [];
  let cursor = '*';
  while (out.length < max) {
    const url =
      `${BASE}/works?filter=authorships.author.id:${cleanId}` +
      `&per-page=${perPage}&cursor=${encodeURIComponent(cursor)}` +
      `&sort=cited_by_count:desc`;
    const data = await json(url);
    const results = Array.isArray(data.results) ? data.results : [];
    for (const w of results) {
      const wk = w as Record<string, unknown>;
      const oa = (wk.open_access ?? {}) as Record<string, unknown>;
      const authorships = Array.isArray(wk.authorships) ? wk.authorships : [];
      const authorIds = authorships
        .map((a: unknown) => {
          const author = (a as Record<string, unknown>).author as Record<string, unknown> | undefined;
          return author?.id ? String(author.id) : null;
        })
        .filter((v): v is string => !!v);
      const primary = (wk.primary_location ?? {}) as Record<string, unknown>;
      const src = (primary.source ?? {}) as Record<string, unknown>;
      const issnL = src.issn_l ? String(src.issn_l) : undefined;
      out.push({
        id: String(wk.id ?? ''),
        doi: wk.doi ? String(wk.doi) : undefined,
        title: String(wk.title ?? wk.display_name ?? ''),
        publicationYear: Number(wk.publication_year ?? 0),
        isOa: Boolean(oa.is_oa),
        citedByCount: Number(wk.cited_by_count ?? 0),
        authorIds,
        sourceIssn: issnL,
      });
      if (out.length >= max) break;
    }
    const meta = (data.meta ?? {}) as { next_cursor?: string };
    if (!meta.next_cursor || results.length === 0) break;
    cursor = meta.next_cursor;
  }
  return out;
}

/** Compute Article 11(6) Open Science compliance from an author's works.
 *  We treat publications from 2024 onwards as post-Uredba (Uredba 59/23 took
 *  effect during 2023, so 2024+ is the strict zone). Pre-2024 works are
 *  excluded from the denominator. */
export interface OpenScienceStats {
  postOrdinanceCount: number;
  depositedCount: number;
  ratio: number;
  fullyCompliant: boolean;
}

export function computeOpenScienceStats(works: OpenAlexWork[]): OpenScienceStats {
  const post = works.filter((w) => w.publicationYear >= 2024);
  const dep = post.filter((w) => w.isOa).length;
  const ratio = post.length === 0 ? 1 : dep / post.length;
  return {
    postOrdinanceCount: post.length,
    depositedCount: dep,
    ratio,
    fullyCompliant: post.length === 0 || ratio === 1,
  };
}

/** Self-citation count for a single work: number of citing works whose author
 *  set overlaps with this author. One API call per work, cached 24 h because
 *  citation counts are slow-moving and the per-researcher snapshot can blow
 *  past 50 OpenAlex calls otherwise. */
export async function countSelfCitations(workId: string, authorId: string): Promise<number> {
  const cleanWork = workId.replace(/^https?:\/\/openalex\.org\//, '');
  const cleanAuthor = authorId.replace(/^https?:\/\/openalex\.org\//, '');
  return cached(`oa:selfcite:${cleanWork}:${cleanAuthor}`, TTL_SELFCITE, async () => {
    const url =
      `${BASE}/works?filter=cites:${cleanWork},authorships.author.id:${cleanAuthor}` +
      `&per-page=1`;
    try {
      const data = await json(url);
      return Number((data.meta as { count?: number } | undefined)?.count ?? 0);
    } catch {
      return 0;
    }
  });
}

/** Total clean citations for an author — total cited_by minus self-cites
 *  across all of the author's works. Concurrency is capped at 6 to be polite. */
export async function citationsExcludingSelf(
  works: OpenAlexWork[],
  authorId: string,
): Promise<{ total: number; self: number; clean: number }> {
  const total = works.reduce((s, w) => s + w.citedByCount, 0);
  let self = 0;
  const queue = [...works];
  const workers = Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const w = queue.shift();
      if (!w) return;
      if (w.citedByCount === 0) continue;
      const c = await countSelfCitations(w.id, authorId);
      self += c;
    }
  });
  await Promise.all(workers);
  const clean = Math.max(0, total - self);
  return { total, self, clean };
}
