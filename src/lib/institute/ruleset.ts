// Rulebook abstraction for white-label builds.
//
// Each institute runs the same Cobiss typology weights + per-title Pogoj
// thresholds through its OWN internal pravilnik, which can diverge at the margins
// (thresholds, education levels, quartile weight tiers). To support that without
// touching the engine, a `Ruleset` captures the tunable parts as DATA. Each
// institute config references a ruleset by id.
//
// v1 strategy: build the abstraction, but ship every institute on the shared
// IER/ARIS baseline. A custom per-institute ruleset is then a new registry entry
// + a professional-services encoding step, not a code change to the engine.
//
// Note: the engine (evaluate.ts / weights.ts) still imports the baseline
// constants directly. Threading `ruleset.criteria` and `ruleset.quartileWeights`
// through the evaluator (so a divergent institute ruleset actually drives the
// math) is the next engine step. Until then this module is the contract + the
// single source of the baseline numbers. No scoring behaviour changes by
// introducing it.

import { TITLE_CRITERIA, type TitleCriteria } from '@/lib/scoring/criteria';
import { DEFAULT_QUARTILE_WEIGHTS, type QuartileWeightTiers } from '@/lib/scoring/weights';

export type RulesetId = 'aris-baseline-v2.2';

export type { QuartileWeightTiers };

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
  quartileWeights: DEFAULT_QUARTILE_WEIGHTS,
};

const RULESETS: Record<RulesetId, Ruleset> = {
  'aris-baseline-v2.2': ARIS_BASELINE_V2_2,
};

export const DEFAULT_RULESET_ID: RulesetId = 'aris-baseline-v2.2';

export function getRuleset(id: RulesetId): Ruleset {
  return RULESETS[id] ?? ARIS_BASELINE_V2_2;
}
