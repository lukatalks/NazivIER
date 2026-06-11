// SICRIS / COBISS data fetchers.
//
// Three layers:
//   1) bibliography JSON (works, no auth)   – typology + COBISS IDs
//   2) profile HTML (works, no auth)        – researcher name from biblio H3
//   3) OpenAlex (separate module)           – citations (replaces fragile SICRIS scrape)
//
// Network calls are kept in this file; parsing in ./parser.ts.

import { fetchIerProjects, projectsForResearcher } from '@/lib/ier/projects';
import {
  citationsExcludingSelf,
  computeOpenScienceStats,
  fetchAuthorWorks,
  resolveAuthor,
  type OpenAlexAuthor,
  type OpenAlexWork,
} from '@/lib/openalex/client';
import { quartileForIssn } from '@/lib/scimago/quartiles';

import { fetchSicrisCitations, type SicrisCitationSummary } from './citations';
import { parseBibliographyJson } from './parser';
import { fetchProfile, inferEducationLevel, type SicrisProfile } from './profile';
import { IER_ROSTER_SEED } from './roster';

import type {
  CitationData,
  EducationLevel,
  IerProjectLeadershipSummary,
  JournalRank,
  OpenScienceCompliance,
  Publication,
} from '@/lib/types';

const BIBLIO_BASE = 'https://bib.cobiss.net/biblioweb';

const UA = 'NazivIER/0.1 (Institute for Economic Research, internal tool)';

/** Per-attempt hard cap for every COBISS round-trip. An un-timed fetch from a
 *  far Vercel region was what let big COBISS bibliographies hang for ~20s before
 *  failing; capping each attempt keeps the whole snapshot bounded and lets the
 *  retry/backoff loop actually do its job instead of stacking slow attempts. */
const FETCH_TIMEOUT_MS = 8000;

/** fetch() with an AbortController timeout. Preserves Next.js `next` cache opts. */
async function fetchWithTimeout(
  url: string,
  init: RequestInit & { next?: { revalidate?: number } } = {},
  timeoutMs = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

type SortKey =
  | 'T.Ydesc'
  | 'T.Yasc'
  | 'T.IF.Ydesc'
  | 'T.CI.Ydesc'
  | 'T.AU.Ydesc'
  | 'TI'
  | 'AC';

/** Fetch ONE year-range slice of the COBISS bibliography. Returns the parsed
 *  publications, or `null` when the slice can't be loaded after `delays.length`
 *  attempts. COBISS biblioweb is fragile: it 500s, returns an empty body, OR
 *  answers 200 with its HTML page shell (empty `<h3></h3>`) instead of JSON when
 *  its backend can't generate the result within its ~5s server-side budget. All
 *  three are treated as retryable; each attempt is hard-capped by a timeout. */
async function fetchBiblioRange(
  sicrisId: string,
  from: number,
  to: number,
  sort: SortKey,
  delays: number[],
): Promise<Publication[] | null> {
  const url = `${BIBLIO_BASE}/authorCobissList/si/slv/cris/${sicrisId}/${sort}/${from}/${to}`;
  for (const delay of delays) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const res = await fetchWithTimeout(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        next: { revalidate: 60 * 60 * 6 },
      });
      if (res.status >= 500 && res.status < 600) continue; // transient – retry
      if (!res.ok) return null; // 4xx won't fix by retrying
      const trimmed = (await res.text()).trim();
      if (!trimmed) continue; // empty body – retry
      if (trimmed.startsWith('<')) continue; // HTML shell, not JSON – retry
      return parseBibliographyJson(JSON.parse(trimmed) as unknown);
    } catch {
      // AbortError (attempt timeout) + JSON.parse failures land here; retry.
    }
  }
  return null;
}

/** Year windows for the chunked fallback, newest-first. Recent years are dense,
 *  so 3-year windows keep each COBISS generation under its ~5s budget; older
 *  years are sparse and fit wider windows. */
function biblioYearWindows(toYear: number): Array<[number, number]> {
  const windows: Array<[number, number]> = [];
  let hi = toYear;
  while (hi >= 2010) {
    const lo = Math.max(hi - 2, 2010);
    windows.push([lo, hi]);
    hi = lo - 1;
  }
  windows.push([2000, 2009]);
  windows.push([1990, 1999]);
  windows.push([1800, 1989]);
  return windows;
}

/** Fetch the full COBISS-typed bibliography list.
 *
 *  Fast path: one full-range request – ~1-3s, works for the large majority.
 *  Fallback: very prolific researchers (e.g. 300+ records) blow past COBISS's
 *  ~5s server-side generation budget, so the full-range query 500s every time
 *  (confirmed COBISS-side, IP-independent). We then fetch in small year windows
 *  – each renders fast enough to succeed – and merge, deduped by COBISS id. This
 *  reliably recovers even the heaviest bibliographies. Throws only when every
 *  range fails (COBISS genuinely down), which the caller degrades gracefully. */
export async function fetchBibliography(
  sicrisId: string,
  opts: { fromYear?: number; toYear?: number; sort?: SortKey } = {},
): Promise<Publication[]> {
  const from = opts.fromYear ?? 1800;
  const to = opts.toYear ?? new Date().getFullYear();
  const sort = opts.sort ?? 'T.CI.Ydesc';

  // Fast path: single full-range request, 2 quick attempts.
  const full = await fetchBiblioRange(sicrisId, from, to, sort, [0, 1500]);
  if (full) return full;

  // Fallback: chunk by year window and merge. Sequential (not parallel) so we
  // don't fire concurrent COBISS requests, which is what triggers throttling.
  const byId = new Map<string, Publication>();
  let anyOk = false;
  for (const [lo, hi] of biblioYearWindows(to)) {
    if (hi < from || lo > to) continue;
    const slice = await fetchBiblioRange(
      sicrisId,
      Math.max(lo, from),
      Math.min(hi, to),
      sort,
      [0, 1200, 3000],
    );
    if (slice) {
      anyOk = true;
      for (const p of slice) byId.set(p.id, p);
    }
  }

  if (!anyOk) {
    throw new Error(`SICRIS bibliography unavailable (all ranges failed) for ${sicrisId}`);
  }
  // Window order is already newest-first; within each window COBISS returned
  // citation-desc. Good enough for the position-based Q1/Q2 fallback heuristic
  // (real quartiles come from the SCImago/OpenAlex ISSN match where available).
  return [...byId.values()];
}

export interface ResearcherSnapshot {
  profile: SicrisProfile;
  publications: Publication[];
  citations: CitationData;
  openAlex?: OpenAlexAuthor;
  openScienceCompliance?: OpenScienceCompliance;
  /** SOK level guessed from the name (dr./mag.). Surface so the UI can
   *  preselect the dropdown and unblock the evaluation immediately. */
  inferredEducationLevel?: EducationLevel;
  /** Diagnostics for the UI: how citations were computed. */
  citationDiagnostics?: {
    rawTotal: number;
    selfExcluded: number;
    clean: number;
    method:
      | 'openalex-self-excluded'
      | 'openalex-raw'
      | 'sicris-wos'
      | 'sicris-wos+openalex';
    /** Did the SICRIS scrape succeed? */
    sicrisFetched: boolean;
  };
  /** Auto-scraped IER project leadership for Pogoj 3. */
  ierProjectLeadership?: IerProjectLeadershipSummary;
  /** True when the COBISS bibliography could not be loaded after all retries.
   *  The snapshot is returned partial (no publications) so the UI can show a
   *  "temporarily unavailable – retry" state instead of a blank 502. */
  bibliographyUnavailable?: boolean;
}

/** All-in-one fetch used by the API route. */
export async function fetchResearcherSnapshot(sicrisId: string): Promise<ResearcherSnapshot> {
  // The bibliography is the ONE input we can't synthesize a fallback for, so we
  // fetch it FIRST and ALONE. Firing it concurrently with the profile + citation
  // scrapes (all three hit bib.cobiss.net) made COBISS throttle and 500 the heavy
  // ones. If it still can't load we degrade gracefully (partial snapshot + flag)
  // rather than 502-ing the whole page.
  let publications: Publication[] = [];
  let bibliographyUnavailable = false;
  try {
    publications = await fetchBibliography(sicrisId);
  } catch {
    bibliographyUnavailable = true;
  }

  const rosterEntry = IER_ROSTER_SEED.find((r) => r.sicrisId === sicrisId);

  // Graceful degradation: COBISS bibliography is down for this researcher. Return
  // a minimal partial snapshot fast so the UI shows a retry banner, not a blank.
  if (bibliographyUnavailable) {
    const profile = await fetchProfile(sicrisId).catch(
      (): SicrisProfile => ({
        sicrisId,
        fullName: rosterEntry?.fullName ?? `SICRIS #${sicrisId}`,
      }),
    );
    const nameForLookup = rosterEntry?.fullName ?? profile.fullName;
    return {
      profile,
      publications: [],
      citations: {
        wosCleanCitations: 0,
        openAlexCleanCitations: 0,
        primarySource: 'none',
      },
      inferredEducationLevel:
        profile.inferredEducationLevel ?? inferEducationLevel(nameForLookup),
      bibliographyUnavailable: true,
    };
  }

  // Bibliography is in hand. Now the rest – they only hit COBISS AFTER the heavy
  // bibliography call has finished, so they no longer contend with it. Each
  // tolerates its own failure.
  const [profile, sicrisCit, ierProjects] = await Promise.all([
    fetchProfile(sicrisId).catch(
      (): SicrisProfile => ({ sicrisId, fullName: `SICRIS #${sicrisId}` }),
    ),
    fetchSicrisCitations(sicrisId, 'W').catch(() => null as SicrisCitationSummary | null),
    fetchIerProjects().catch(() => []),
  ]);

  // Prefer the roster's full name for the OpenAlex lookup (includes ", mag."
  // suffix that the SICRIS biblio H3 strips); fall back to the SICRIS profile.
  const nameForLookup = rosterEntry?.fullName ?? profile.fullName;
  // OpenAlex is secondary data (Q1/Q2 tagging, self-citation exclusion, OA
  // detection) and must never crash the snapshot, so wrap the resolution.
  const author = await resolveAuthor({
    name: nameForLookup,
    orcid: rosterEntry?.orcid,
  }).catch((): OpenAlexAuthor | null => null);

  // Re-run education inference using the richer roster name so we pick up
  // ", mag." suffixes that the biblio H3 doesn't expose. The profile's own
  // inferredEducationLevel still wins if it's truthy.
  const inferredEdu =
    profile.inferredEducationLevel ?? inferEducationLevel(nameForLookup);

  // OpenAlex per-work data drives:
  //   (a) Q1/Q2 quartile tagging via SCImago ISSN lookup
  //   (b) Open Science compliance under Article 11(6)
  //   (c) Self-citation exclusion (Article 13 – "čisti citati")
  let works: OpenAlexWork[] = [];
  if (author?.openalexId) {
    try {
      works = await fetchAuthorWorks(author.openalexId, 200);
    } catch {
      works = [];
    }
  }

  const tagged = tagJournalRanks(publications, works);

  // Compute Open Science compliance from author works (post-2024 OA ratio).
  const osStats = works.length > 0 ? computeOpenScienceStats(works) : undefined;

  // Self-citation-excluded total. Falls back to raw cited_by_count if the
  // per-work pass fails.
  let rawTotal = author?.citedByCount ?? 0;
  let selfExcluded = 0;
  let openAlexClean = rawTotal;
  let oaMethod: 'openalex-self-excluded' | 'openalex-raw' = 'openalex-raw';
  if (author?.openalexId && works.length > 0) {
    try {
      const r = await citationsExcludingSelf(works, author.openalexId);
      rawTotal = r.total;
      selfExcluded = r.self;
      openAlexClean = r.clean;
      oaMethod = 'openalex-self-excluded';
    } catch {
      /* fall through to raw count */
    }
  }

  // SICRIS-sourced WoS clean citations. When the scrape succeeds, this is the
  // figure ARIS evaluators would quote, so we promote it to the primary
  // `wosCleanCitations` slot. OpenAlex stays available as a broader-coverage
  // diagnostic alongside.
  const sicrisWos = sicrisCit?.cleanCitations;
  const usingSicris = typeof sicrisWos === 'number' && sicrisCit !== null;
  const primaryCit = usingSicris ? (sicrisWos as number) : openAlexClean;
  const primarySource: NonNullable<CitationData['primarySource']> = usingSicris
    ? 'sicris-wos'
    : openAlexClean > 0
      ? 'openalex'
      : 'none';
  const diagnosticsMethod: ResearcherSnapshot['citationDiagnostics'] = usingSicris
    ? {
        rawTotal,
        selfExcluded,
        clean: primaryCit,
        method:
          oaMethod === 'openalex-self-excluded'
            ? 'sicris-wos+openalex'
            : 'sicris-wos',
        sicrisFetched: true,
      }
    : {
        rawTotal,
        selfExcluded,
        clean: openAlexClean,
        method: oaMethod,
        sicrisFetched: false,
      };

  const citations: CitationData = {
    wosCleanCitations: primaryCit,
    sicrisWosCleanCitations: sicrisWos,
    sicrisHIndexWos: sicrisCit?.hIndex,
    openAlexCleanCitations: openAlexClean,
    openAlexHIndex: author?.hIndex,
    primarySource,
  };

  // Project leadership rollup from the IER website.
  const projectRollup =
    ierProjects.length > 0
      ? projectsForResearcher(ierProjects, nameForLookup)
      : null;
  const projectSummary: IerProjectLeadershipSummary | undefined = projectRollup
    ? {
        ledCount: projectRollup.ledCount,
        ledYears: projectRollup.ledYears,
        ledExternalCount: projectRollup.ledExternalCount,
        led: projectRollup.led.map((p) => ({
          title: p.title,
          funder: p.funder,
          code: p.code,
          startDate: p.startDate,
          endDate: p.endDate,
          projectType: p.projectType,
          url: p.url,
        })),
        sourceUrl: projectRollup.sourceUrl,
      }
    : undefined;

  return {
    profile,
    publications: tagged,
    citations,
    openAlex: author ?? undefined,
    openScienceCompliance: osStats,
    inferredEducationLevel: inferredEdu,
    citationDiagnostics: diagnosticsMethod,
    ierProjectLeadership: projectSummary,
  };
}

/** Tag journal rank using SCImago ISSN lookup when an OpenAlex work matches
 *  the SICRIS publication by title; also propagates the auto-detected OA
 *  flag so the per-pub override UI starts with an honest default. Falls
 *  back to the legacy heuristic when no OpenAlex source ISSN is available. */
function tagJournalRanks(publications: Publication[], works: OpenAlexWork[]): Publication[] {
  // Build title → ISSN map AND title → OA map from OpenAlex works.
  const issnByTitle = new Map<string, string>();
  const oaByTitle = new Map<string, boolean>();
  for (const w of works) {
    if (!w.title) continue;
    const key = normalize(w.title);
    if (w.sourceIssn) issnByTitle.set(key, w.sourceIssn);
    oaByTitle.set(key, w.isOa);
  }

  let scimagoTagged = 0;
  publications.forEach((p) => {
    const key = normalize(p.title);
    // Auto-detected OA flag drives the per-pub override UI default and the
    // Article 11(6) compliance ratio when the user hasn't set an override.
    const autoOa = oaByTitle.get(key);
    if (typeof autoOa === 'boolean') p.openAccessAuto = autoOa;

    if (p.typology !== '1.01' && p.typology !== '1.02') return;
    const issn = issnByTitle.get(key);
    if (!issn) return;
    const q = quartileForIssn(issn);
    if (q) {
      p.journalRank = q;
      scimagoTagged++;
    }
  });

  // For 1.01/1.02 publications still missing a rank, fall back to the
  // top-quartile-by-sort heuristic so the calculator stays useful.
  const untagged = publications.filter(
    (p) => (p.typology === '1.01' || p.typology === '1.02') && !p.journalRank,
  );
  const q1Cutoff = Math.ceil(untagged.length * 0.25);
  const q2Cutoff = Math.ceil(untagged.length * 0.5);
  untagged.forEach((p, idx) => {
    if (idx < q1Cutoff) p.journalRank = 'Q1';
    else if (idx < q2Cutoff) p.journalRank = 'Q2';
    else p.journalRank = 'indexed-other';
  });

  // Surface count via a non-enumerable hint? Not needed – we set journalRank.
  void scimagoTagged;
  return publications;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

// Backward-compat export for any caller still importing the heuristic helper.
export type { JournalRank };
