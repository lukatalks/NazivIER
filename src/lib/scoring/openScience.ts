// Live Open-Science (Article 11(6)) computation — the single source of truth
// shared by the evaluator, the summary strip, the metadata deposits gate, and
// the markdown export.
//
// Why this module exists: before v3.2 there were TWO divergent OA computations.
// The server snapshot (Researcher.openScienceCompliance) was built from OpenAlex
// works, never saw the user's per-publication overrides, and drove the summary
// strip + the deposits gate — so toggling a publication to »odprti dostop«
// changed the per-card evidence text but NOT the headline ratio (Tjaša Bartolj's
// bug report, 2026-06-10: »ko popraviš, da je nekaj dejansko v odprtem dostopu,
// se delež pri izračunu ne spremeni«). This module walks the researcher's COBISS
// publications, applies per-pub overrides, and restricts the denominator to
// genuine scientific publications subject to evaluation, so every surface shows
// the same live number.

import type { Publication, Researcher } from '@/lib/types';

/** Typology codes that count as »znanstvene objave« under Article 11(6).
 *
 *  Pravilnik v2.2, Article 11(6) (verbatim): »Za znanstvene objave, ki so
 *  predmet presoje … mora kandidat zagotoviti odprti dostop«. So the OA
 *  requirement applies only to SCIENTIFIC publications that are SUBJECT TO
 *  EVALUATION — not to every class-1 COBISS item.
 *
 *  The previous `/^1\./` filter wrongly swept in interviews (1.22 — Tjaša's
 *  Dnevnik case), book reviews (1.19), forewords (1.20), polemics (1.21),
 *  professional articles (1.04) and popular articles (1.05) — none of which are
 *  scientific publications subject to Uredba 59/23. This is the set of genuinely
 *  scientific class-1 typologies (all of them carry a Pogoj-1 weight, so they
 *  are by definition »predmet presoje«).
 *
 *  Scientific monographs (2.01) and reviewed scientific proceedings (2.31) are
 *  also »znanstvene objave, ki so predmet presoje«, so per the rulebook text
 *  they ARE in scope. Open access for a whole printed monograph is often not
 *  feasible — that is exactly what the publisher-restriction exemption
 *  ('restricted-not-possible') is for, NOT a reason to drop them from the
 *  denominator. (Scientific reference works 2.27/2.28 and scientific A/V 2.18
 *  are also typed »znanstveni« but virtually never appear in post-2024 IER
 *  bibliographies; add them here if they ever do.) */
export const OA_SCIENTIFIC_TYPOLOGIES = new Set<string>([
  '1.01', // izvirni znanstveni članek
  '1.02', // pregledni znanstveni članek
  '1.03', // drugi znanstveni članki
  '1.06', // objavljeni znanstveni prispevek na konferenci (vabljeno predavanje)
  '1.08', // objavljeni znanstveni prispevek na konferenci
  '1.16', // samostojni znanstveni sestavek ali poglavje v monografiji
  '1.26', // znanstveni sestavek v slovarju, enciklopediji, leksikonu
  '2.01', // znanstvena monografija
  '2.31', // zbornik recenziranih znanstvenih prispevkov (mednarodna/tuja konf.)
]);

/** Uredba 59/23 took effect during 2023, so 2024+ is the strict open-access
 *  zone (mirrors the OpenAlex snapshot cut-off in openalex/client.ts). */
export const OA_FIRST_YEAR = 2024;

/** Does this publication fall under the Article 11(6) open-access requirement?
 *  True only for post-2024 scientific publications subject to evaluation. The
 *  per-publication OA radios in MetadataPanel use exactly this predicate, so the
 *  rows that show a radio are exactly the rows that count toward the ratio. */
export function isOaApplicable(p: Pick<Publication, 'year' | 'typology'>): boolean {
  return p.year >= OA_FIRST_YEAR && OA_SCIENTIFIC_TYPOLOGIES.has(p.typology);
}

export interface LiveOpenScience {
  /** Post-2024 scientific publications subject to 11(6) (the denominator). */
  total: number;
  openCount: number;
  restrictedCount: number;
  closedCount: number;
  /** open + restricted-not-possible — the rulebook exemption (»razen kadar to
   *  onemogočajo založniške omejitve«) counts as satisfied. */
  satisfied: number;
  /** Publications still missing open access. */
  missing: number;
  /** satisfied / total, or 1 when nothing is in scope. */
  ratio: number;
  fullyCompliant: boolean;
  /** True when at least one publication is in scope (so the UI knows to show). */
  hasData: boolean;
}

/** Walk the researcher's publications and compute the live Article 11(6) figures,
 *  honouring per-publication user overrides. Every UI surface and the evaluator
 *  should consume this — never the immutable server snapshot. */
export function computeLiveOpenScience(
  r: Pick<Researcher, 'publications'>,
): LiveOpenScience {
  let openCount = 0;
  let restrictedCount = 0;
  let closedCount = 0;
  for (const p of r.publications) {
    if (!isOaApplicable(p)) continue;
    const state: 'open' | 'restricted-not-possible' | 'closed' =
      p.openAccessOverride ?? (p.openAccessAuto ? 'open' : 'closed');
    if (state === 'open') openCount++;
    else if (state === 'restricted-not-possible') restrictedCount++;
    else closedCount++;
  }
  const total = openCount + restrictedCount + closedCount;
  const satisfied = openCount + restrictedCount;
  const ratio = total === 0 ? 1 : satisfied / total;
  return {
    total,
    openCount,
    restrictedCount,
    closedCount,
    satisfied,
    missing: total - satisfied,
    ratio,
    fullyCompliant: total === 0 || ratio === 1,
    hasData: total > 0,
  };
}
