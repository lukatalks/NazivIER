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

type SortKey =
  | 'T.Ydesc'
  | 'T.Yasc'
  | 'T.IF.Ydesc'
  | 'T.CI.Ydesc'
  | 'T.AU.Ydesc'
  | 'TI'
  | 'AC';

/** Fetch the COBISS-typed bibliography list (JSON). Retries on 5xx with backoff
 *  because SICRIS occasionally returns transient 500s – happens when the nginx
 *  front blows out its session cache. Two retries (1.5s, 4s) are enough in practice. */
export async function fetchBibliography(
  sicrisId: string,
  opts: { fromYear?: number; toYear?: number; sort?: SortKey } = {},
): Promise<Publication[]> {
  const from = opts.fromYear ?? 1800;
  const to = opts.toYear ?? new Date().getFullYear();
  const sort = opts.sort ?? 'T.CI.Ydesc';

  const url = `${BIBLIO_BASE}/authorCobissList/si/slv/cris/${sicrisId}/${sort}/${from}/${to}`;

  const delays = [0, 1500, 4000];
  let lastErr: Error | null = null;

  for (const delay of delays) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'application/json' },
        next: { revalidate: 60 * 60 * 6 },
      });

      if (res.status >= 500 && res.status < 600) {
        lastErr = new Error(`SICRIS bibliography ${res.status} (transient) for ${sicrisId}`);
        continue;
      }
      if (!res.ok) {
        throw new Error(`SICRIS bibliography fetch failed (${res.status}) for ${sicrisId}`);
      }

      const text = await res.text();
      if (!text.trim()) {
        // Empty body – SICRIS sometimes returns 200 with nothing when overloaded.
        lastErr = new Error(`SICRIS returned empty body for ${sicrisId}`);
        continue;
      }
      const raw = JSON.parse(text) as unknown;
      return parseBibliographyJson(raw);
    } catch (e) {
      lastErr = e instanceof Error ? e : new Error(String(e));
    }
  }

  throw lastErr ?? new Error(`SICRIS bibliography fetch failed for ${sicrisId}`);
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
}

/** All-in-one fetch used by the API route. */
export async function fetchResearcherSnapshot(sicrisId: string): Promise<ResearcherSnapshot> {
  // Run the three independent SICRIS/COBISS/IER calls in parallel. Each one
  // tolerates failure on its own and we fall back to sensible defaults below.
  const [publications, profile, sicrisCit, ierProjects] = await Promise.all([
    fetchBibliography(sicrisId),
    fetchProfile(sicrisId).catch(
      (): SicrisProfile => ({ sicrisId, fullName: `SICRIS #${sicrisId}` }),
    ),
    fetchSicrisCitations(sicrisId, 'W').catch(() => null as SicrisCitationSummary | null),
    fetchIerProjects().catch(() => []),
  ]);

  const rosterEntry = IER_ROSTER_SEED.find((r) => r.sicrisId === sicrisId);
  // Prefer the roster's full name for the OpenAlex lookup (includes ", mag."
  // suffix that the SICRIS biblio H3 strips); fall back to the SICRIS profile.
  const nameForLookup = rosterEntry?.fullName ?? profile.fullName;
  const author = await resolveAuthor({
    name: nameForLookup,
    orcid: rosterEntry?.orcid,
  });

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
 *  the SICRIS publication by title; falls back to the legacy heuristic when
 *  no OpenAlex source ISSN is available. */
function tagJournalRanks(publications: Publication[], works: OpenAlexWork[]): Publication[] {
  // Build title → ISSN map from OpenAlex works.
  const issnByTitle = new Map<string, string>();
  for (const w of works) {
    if (w.sourceIssn && w.title) {
      issnByTitle.set(normalize(w.title), w.sourceIssn);
    }
  }

  let scimagoTagged = 0;
  publications.forEach((p) => {
    if (p.typology !== '1.01' && p.typology !== '1.02') return;
    const issn = issnByTitle.get(normalize(p.title));
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
