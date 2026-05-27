// SICRIS / COBISS data fetchers.
//
// Three layers:
//   1) bibliography JSON (works, no auth)   — typology + COBISS IDs
//   2) profile HTML (works, no auth)        — researcher name from biblio H3
//   3) OpenAlex (separate module)           — citations (replaces fragile SICRIS scrape)
//
// Network calls are kept in this file; parsing in ./parser.ts.

import { resolveAuthor, type OpenAlexAuthor } from '@/lib/openalex/client';

import { parseBibliographyJson } from './parser';
import { fetchProfile, type SicrisProfile } from './profile';
import { IER_ROSTER_SEED } from './roster';

import type { CitationData, Publication } from '@/lib/types';

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

/** Fetch the COBISS-typed bibliography list (JSON). */
export async function fetchBibliography(
  sicrisId: string,
  opts: { fromYear?: number; toYear?: number; sort?: SortKey } = {},
): Promise<Publication[]> {
  const from = opts.fromYear ?? 1800;
  const to = opts.toYear ?? new Date().getFullYear();
  const sort = opts.sort ?? 'T.CI.Ydesc';

  const url = `${BIBLIO_BASE}/authorCobissList/si/slv/cris/${sicrisId}/${sort}/${from}/${to}`;

  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!res.ok) {
    throw new Error(`SICRIS bibliography fetch failed (${res.status}) for ${sicrisId}`);
  }

  const raw = (await res.json()) as unknown;
  return parseBibliographyJson(raw);
}

export interface ResearcherSnapshot {
  profile: SicrisProfile;
  publications: Publication[];
  citations: CitationData;
  openAlex?: OpenAlexAuthor;
}

/** All-in-one fetch used by the API route. */
export async function fetchResearcherSnapshot(sicrisId: string): Promise<ResearcherSnapshot> {
  const [publications, profile] = await Promise.all([
    fetchBibliography(sicrisId),
    fetchProfile(sicrisId).catch(() => ({ sicrisId, fullName: `SICRIS #${sicrisId}` })),
  ]);

  const rosterEntry = IER_ROSTER_SEED.find((r) => r.sicrisId === sicrisId);
  const author = await resolveAuthor({
    name: profile.fullName,
    orcid: rosterEntry?.orcid,
  });

  // Heuristic Q1/Q2 tagging: SICRIS bibliography JSON is pre-sorted by
  // typology then citations desc, so for 1.01/1.02 we approximate
  // top quartile -> Q1, next quartile -> Q2. Users can override per pub.
  const tagged = tagJournalRanksHeuristic(publications);

  const citations: CitationData = {
    // We map OpenAlex's lifetime cited_by_count to the WoS-clean slot because
    // the rulebook compares against a single citation threshold. OpenAlex includes
    // self-citations, so the value tends to be 5–15 % higher than strict WoS-clean.
    wosCleanCitations: author?.citedByCount ?? 0,
  };

  return {
    profile,
    publications: tagged,
    citations,
    openAlex: author ?? undefined,
  };
}

function tagJournalRanksHeuristic(publications: Publication[]): Publication[] {
  const q12Candidates = publications.filter((p) => p.typology === '1.01' || p.typology === '1.02');
  const q1Cutoff = Math.ceil(q12Candidates.length * 0.25);
  const q2Cutoff = Math.ceil(q12Candidates.length * 0.5);

  q12Candidates.forEach((p, idx) => {
    if (idx < q1Cutoff) p.journalRank = 'Q1';
    else if (idx < q2Cutoff) p.journalRank = 'Q2';
    else p.journalRank = 'indexed-other';
  });

  return publications;
}
