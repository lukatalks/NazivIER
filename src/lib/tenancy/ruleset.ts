// Rulebook abstraction for white-label multi-tenancy.
//
// The scoring engine itself is national in spirit (it applies the Cobiss
// typology weights + the per-title Pogoj thresholds), but each Slovenian
// research organisation runs the criteria through its OWN internal pravilnik,
// which can diverge at the margins (thresholds, education levels, quartile
// weight tiers). To support that without forking the engine, a `Ruleset`
// captures the tunable parts as DATA. Every tenant references a ruleset by id.
//
// v1 strategy (agreed 2026-06-13): build the abstraction, but ship every tenant
// on the shared IER/national baseline. A custom per-institute ruleset is then a
// drop-in registry entry + a professional-services encoding step, not a code
// change to the engine.
//
// Phase 0 note: the engine (evaluate.ts / weights.ts) still imports the baseline
// constants directly. Phase 1 threads `ruleset.criteria` and
// `ruleset.quartileWeights` through the evaluator so a tenant's ruleset actually
// drives the math. Until then this module is the contract + the single source of
// the baseline numbers. No scoring behaviour changes by introducing it.

import { TITLE_CRITERIA, type TitleCriteria } from '@/lib/scoring/criteria';

export type RulesetId = 'aris-baseline-v2.2';

/** Weight tiers for the quartile-conditional typologies (1.01 / 1.02). */
export interface QuartileWeightTiers {
  q1: number;
  q2: number;
  /** Q3, Q4, not-indexed, unknown. */
  other: number;
}

export interface Ruleset {
  id: RulesetId;
  /** Human-readable label for diagnostics / admin. */
  label: string;
  /** Source pravilnik version this ruleset encodes (mirrors ALGO_VERSION). */
  pravilnikVersion: string;
  /** Per-title threshold table (Priloga 2 + 3). */
  criteria: TitleCriteria[];
  /** Quartile weight tiers for 1.01 / 1.02. */
  quartileWeights: QuartileWeightTiers;
}

const ARIS_BASELINE_V2_2: Ruleset = {
  id: 'aris-baseline-v2.2',
  label: 'IER / ARIS baseline (pravilnik v2.2, 05.06.2026)',
  pravilnikVersion: '2026-06-09-v2.2-final',
  criteria: TITLE_CRITERIA,
  quartileWeights: { q1: 1.5, q2: 1.0, other: 0.7 },
};

const RULESETS: Record<RulesetId, Ruleset> = {
  'aris-baseline-v2.2': ARIS_BASELINE_V2_2,
};

export const DEFAULT_RULESET_ID: RulesetId = 'aris-baseline-v2.2';

export function getRuleset(id: RulesetId): Ruleset {
  return RULESETS[id] ?? ARIS_BASELINE_V2_2;
}
