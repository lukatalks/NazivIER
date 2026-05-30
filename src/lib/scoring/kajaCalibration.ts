// Kaja-mode calibration – stakeholder dialogue view.
//
// Background: a reviewer (»Kaja«) hypothesised the Pravilnik thresholds might
// be too low. To test that, she asked: »count only first / leading /
// corresponding authors and award recipients, weight 1; drop everything else«.
//
// This is NOT a rulebook bypass – the official evaluator (`evaluate.ts`)
// still drives pass/fail. This module returns an alternative Σ shown
// alongside the rulebook Σ so the reviewer can compare and discuss.
//
// Spec (typology-faithful interpretation B):
//   factor = 1 IF publication's authorshipRole === 'first-or-corresponding'
//   factor = 1 IF the achievement is a weight-1.0 award/mentorship
//   factor = 0 otherwise (equal-or-co, other-coauthor, default)
//   typology weight stays as in Pravilnik Priloga 3 (no bypass)
//
// What's NOT covered (transparently reported in the UI):
// - Senior-author proxy (last-author + ≥3 co-authors) – the COBISS bibliography
//   feed delivered to this app does not include the full author list, only the
//   selected researcher's role. The senior-author signal lives only in the
//   COBISS+ HTML scrape used for the offline calibration table.
// - Q1/Q2 ISSN auto-detection beyond the in-app SCImago seed (~60 econ journals).

import { weightFor } from './weights';

import type { Researcher } from '@/lib/types';

export interface KajaCalibration {
  /** Σ under Kaja's strict definition (alternative to the rulebook Σ). */
  total: number;
  /** Per-publication contributions that DID count (factor = 1). */
  firstOrCorrespondingCount: number;
  /** How many publications were skipped because role !== first/corresponding. */
  skippedCount: number;
  /** Award entries (weight-1.0 ExtraAchievements) contributing 1 each. */
  awardCount: number;
  /** Contribution from awards (= awardCount × 1.0). */
  awardContribution: number;
  /** Contribution from publications (= sum of typology weights where role qualifies). */
  publicationContribution: number;
}

export function computeKajaCalibration(r: Researcher): KajaCalibration {
  let publicationContribution = 0;
  let firstOrCorrespondingCount = 0;
  let skippedCount = 0;
  for (const pub of r.publications) {
    const w = weightFor(pub);
    if (w === 0) continue; // typology not in Annex 3 - matches rulebook behaviour
    if (pub.authorshipRole === 'first-or-corresponding') {
      publicationContribution += w; // factor = 1
      firstOrCorrespondingCount += 1;
    } else {
      skippedCount += 1;
    }
  }
  const awardCount = r.extraAchievements?.weight10Count ?? 0;
  const awardContribution = awardCount * 1.0; // factor = 1 per Kaja's spec
  return {
    total: Math.round((publicationContribution + awardContribution) * 100) / 100,
    firstOrCorrespondingCount,
    skippedCount,
    awardCount,
    awardContribution,
    publicationContribution: Math.round(publicationContribution * 100) / 100,
  };
}
