// Parsers for SICRIS / COBISS responses.

import { parse as parseHtml } from 'node-html-parser';
import { z } from 'zod';

import type { CitationData, Publication } from '@/lib/types';

// ──────────────────────────────────────────────────────────────────────────────
// 1) Bibliography JSON
//    GET https://bib.cobiss.net/biblioweb/authorCobissList/si/slv/cris/{id}/{sort}/{from}/{to}
// ──────────────────────────────────────────────────────────────────────────────

const RawUnit = z.object({
  id: z.string(),
  title: z.string().optional().default(''),
  parentTitle: z.string().optional(),
  fullTitle: z.string().optional(),
  yearFrom: z.string().optional(),
  typology: z.string().optional().default(''),
  typologyDescr: z.string().optional(),
});

const RawUnitList = z.array(RawUnit);

export function parseBibliographyJson(raw: unknown): Publication[] {
  const units = RawUnitList.parse(raw);
  return units.map((u) => ({
    id: u.id,
    title: stripTags(u.title),
    parentTitle: u.parentTitle ? stripTags(u.parentTitle) : undefined,
    year: Number(u.yearFrom ?? 0) || 0,
    typology: normalizeTypology(u.typology),
    typologyDescr: u.typologyDescr,
  }));
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

function normalizeTypology(t: string): string {
  // SICRIS already returns "1.01", "2.01", etc., but defend against stray whitespace.
  return t.trim();
}

// ──────────────────────────────────────────────────────────────────────────────
// 2) Citation page HTML
//    GET https://bib.cobiss.net/biblioweb/cit/si/slv/citrsr/{id}
//
// We scan the page for the WoS and Scopus rows of the citation table.
// Layout differs slightly per researcher; we look for the labels "WoS" / "Scopus"
// next to numeric "čisti citati" columns.
// ──────────────────────────────────────────────────────────────────────────────

export function parseCitationPage(html: string): CitationData {
  const root = parseHtml(html);
  const text = root.text;

  // The citation summary follows this Slovenian pattern on the SICRIS researcher page:
  //   "WoS  povezani zapisi {N}  citati {M}  čisti citati {K}  povprečje čistih citatov {x,yz}"
  // Citations form is similar.
  const wos = matchCleanCitations(text, /WoS[\s\S]{0,300}?čisti\s+citati[\s\S]{0,40}?(\d[\d.,]*)/i);
  const scopus = matchCleanCitations(
    text,
    /Scopus[\s\S]{0,300}?čisti\s+citati[\s\S]{0,40}?(\d[\d.,]*)/i,
  );

  return {
    wosCleanCitations: wos ?? 0,
    scopusCleanCitations: scopus,
  };
}

function matchCleanCitations(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  if (!m) return undefined;
  const n = Number(m[1].replace(/[.\s]/g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

// ──────────────────────────────────────────────────────────────────────────────
// 3) Evaluation page HTML
//    GET https://bib.cobiss.net/biblioweb/eval/si/slv/evalrsr/{id}
//
// The "Vrednotenje" block on the SICRIS researcher page exposes the ARIS
// bibliographic-indicator counts:
//   Upoš.tč.   total weighted points (skipped — not needed by us)
//   A''         number of publications in the topmost-tier journals (1A1 in COBISS)
//   A'          number of publications in second-tier journals (1A1 ∪ 1A2, minus A'')
//   A1/2        number of publications in 1A1 ∪ 1A2 (Q1 + Q2)
//   CI10, CImax, CIneto, h10, A1, A3  (not needed by us)
// ──────────────────────────────────────────────────────────────────────────────

export function parseEvalPage(html: string): {
  aDoublePrime: number;
  aPrime: number;
  a12: number;
} {
  const text = parseHtml(html).text;
  return {
    aDoublePrime: matchInt(text, /A''[^0-9-]{0,40}(\d+)/) ?? 0,
    aPrime: matchInt(text, /(?<!A)A'[^0-9-]{0,40}(\d+)/) ?? 0,
    a12: matchInt(text, /A1\/2[^0-9-]{0,40}(\d+)/) ?? 0,
  };
}

function matchInt(text: string, re: RegExp): number | undefined {
  const m = text.match(re);
  if (!m) return undefined;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : undefined;
}
