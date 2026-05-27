// SICRIS / COBISS data fetchers.
//
// Three layers:
//   1) bibliography JSON (works, no auth)        — typology + COBISS IDs
//   2) eval/cit form HTML (works, no auth)       — A''/A'/A1/2 totals, WoS/Scopus citations
//   3) cris.cobiss.net SPA (auth-gated 401)      — not used; eval form covers it
//
// Network calls are kept in this file; parsing in ./parser.ts.

import { parseCitationPage, parseBibliographyJson, parseEvalPage } from './parser';

import type { Publication, CitationData } from '@/lib/types';

const BIBLIO_BASE = 'https://bib.cobiss.net/biblioweb';

const UA =
  'NazivIER/0.1 (+https://nazivier.vercel.app; internal title-evaluation tool, Institute for Economic Research, Ljubljana)';

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
    // ISR-friendly cache: SICRIS bibliographies change at most a few times per week.
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!res.ok) {
    throw new Error(`SICRIS bibliography fetch failed (${res.status}) for ${sicrisId}`);
  }

  const raw = (await res.json()) as unknown;
  return parseBibliographyJson(raw);
}

/** Fetch the citation summary page (HTML). Parses WoS/Scopus clean citations. */
export async function fetchCitations(sicrisId: string): Promise<CitationData> {
  const url = `${BIBLIO_BASE}/cit/si/slv/citrsr/${sicrisId}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) {
    throw new Error(`SICRIS citations fetch failed (${res.status}) for ${sicrisId}`);
  }
  const html = await res.text();
  return parseCitationPage(html);
}

/** Fetch the evaluation page (HTML). Parses A''/A'/A1/2 marker counts. */
export async function fetchEvaluationMarkers(sicrisId: string): Promise<{
  aDoublePrime: number;
  aPrime: number;
  a12: number;
}> {
  const url = `${BIBLIO_BASE}/eval/si/slv/evalrsr/${sicrisId}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) {
    throw new Error(`SICRIS evaluation fetch failed (${res.status}) for ${sicrisId}`);
  }
  const html = await res.text();
  return parseEvalPage(html);
}

/** All-in-one fetch used by the API route. */
export async function fetchResearcherSnapshot(sicrisId: string) {
  // Parallelize — three independent network calls.
  const [publications, citations, evalMarkers] = await Promise.all([
    fetchBibliography(sicrisId),
    fetchCitations(sicrisId).catch(() => ({ wosCleanCitations: 0 })),
    fetchEvaluationMarkers(sicrisId).catch(() => ({ aDoublePrime: 0, aPrime: 0, a12: 0 })),
  ]);

  // Cross-tag publications: any 1.01/1.02 also present in the A12 list is Q1/Q2.
  // The eval page only gives aggregate counts (not per-publication), so we mark the
  // top-cited 1.01/1.02 publications up to `evalMarkers.a12` count as Q1/Q2.
  // This is a deterministic, transparent heuristic — user can override per pub.
  const heuristicallyTagged = tagJournalRanks(publications, evalMarkers);

  return {
    publications: heuristicallyTagged,
    citations,
    evalMarkers,
  };
}

function tagJournalRanks(
  publications: Publication[],
  markers: { aDoublePrime: number; aPrime: number; a12: number },
): Publication[] {
  // Sort 1.01/1.02 by year desc so top-cited come first (the JSON is already sorted T.CI.Ydesc).
  const q12Candidates = publications.filter((p) => p.typology === '1.01' || p.typology === '1.02');
  const totalQ12 = markers.a12; // A1/2 is the union of Q1 and Q2 publications

  // Mark the first `totalQ12` as Q1/Q2 (Q1 specifically if within aDoublePrime + aPrime range).
  q12Candidates.forEach((p, idx) => {
    if (idx < markers.aDoublePrime) p.journalRank = 'Q1';
    else if (idx < totalQ12) p.journalRank = 'Q2';
    else p.journalRank = 'indexed-other';
  });

  return publications;
}
