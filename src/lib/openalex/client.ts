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

const BASE = 'https://api.openalex.org';
const IER_OPENALEX_INSTITUTION_ID = 'I4210104025'; // Institute for Economic Research, Ljubljana
const POLITE_EMAIL = 'ai@scaientist.com'; // OpenAlex polite-pool requires a contact email

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
  if (opts.orcid) {
    const a = await byOrcid(opts.orcid);
    if (a) return a;
  }
  if (opts.name) {
    return byName(opts.name);
  }
  return null;
}
