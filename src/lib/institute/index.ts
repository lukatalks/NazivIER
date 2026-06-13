// The single import surface for institute configuration.
//
// `INSTITUTE` is the institute this deployment is white-labelled for. To create a
// build for another institute, add its config (copy ./ier.ts) and point INSTITUTE
// at it — that is the only line that changes the active institute.

import { IER_INSTITUTE } from '@/lib/institute/ier';

export * from '@/lib/institute/types';
export { instituteThemeCss } from '@/lib/institute/theme';
export { getRuleset, DEFAULT_RULESET_ID } from '@/lib/institute/ruleset';
export type { Ruleset, RulesetId, QuartileWeightTiers } from '@/lib/institute/ruleset';

/** The active institute for this build. */
export const INSTITUTE = IER_INSTITUTE;
