// Kaja-mode full simulation engine — password-gated reviewer dialogue tool.
//
// What this is: a what-if calculator that re-runs the rulebook math under
// alternative assumptions. The reviewer (»Kaja«) can flip authorship policies,
// award factors, OS thresholds, citation sources, leadership values and even
// global threshold multipliers, then immediately see how every per-title
// pass/fail verdict shifts.
//
// What this is NOT: it never replaces `evaluate.ts`. The official evaluator
// remains the only source of eligibility truth. This module returns a parallel
// simulation result rendered alongside the rulebook verdict so a reviewer can
// stress-test thresholds and authorship rules in front of the committee.
//
// Methodology is mirror-faithful to Pravilnik IER (predlog 05.06.2026, v2.2),
// Priloga 3: same Pogoj 1/2/3 shape, same standardsRequired, same education
// check, same OA logic from Article 11(6). The only thing that varies is the
// knob values the reviewer supplies.
//
// v2.8 (05.06.2026) changes:
//   * Pogoj 2 + Pogoj 3 use EUR values (no longer FTE).
//   * OpenAlex dropped from citation sources per email Kaja Primc 05.06.
//     CitationSource union shrinks to 'wos' | 'scopus' | 'max-of-two'.

import { authorshipFactor } from './authorship';
import { TITLE_CRITERIA, type TitleCriteria } from './criteria';
import { weightFor } from './weights';

import type {
  AuthorshipRole,
  Publication,
  Researcher,
  Title,
} from '@/lib/types';

// ─── Config types ────────────────────────────────────────────────────────

export type AuthorshipPolicy =
  | 'pravilnik' // rulebook: 1.0 / 0.7 / 0.3, unknown → 0.7
  | 'strict-first-corr' // Kaja's ask: 1.0 for first/corr, 0 otherwise
  | 'lenient-all' // 1.0 for every role (sanity ceiling)
  | 'custom'; // freeform per-role sliders

// v2.8: OpenAlex removed per Pravilnik v2.2 (»ni splošno uporabljen v pravilnikih«).
export type CitationSource = 'wos' | 'scopus' | 'max-of-two';

export interface SimulationConfig {
  // ─── Pogoj 1 ─────────────────────────────────────────────────────
  /** Publication weight schedule (Annex 3). Defaults mirror weights.ts.
   *  1.01/1.02 are quartile-conditional; 1.03 is a single weight. Lets the
   *  reviewer model a proposed rulebook amendment without touching weights.ts. */
  pog1Weights: {
    /** 1.01/1.02 in WoS/Scopus Q1. Rulebook v2.2 = 1.5. */
    q1: number;
    /** 1.01/1.02 in WoS/Scopus Q2. Rulebook v2.2 = 1.0. */
    q2: number;
    /** 1.01/1.02 outside Q1/Q2 (Q3/Q4/unindexed/unknown). Rulebook v2.2 = 0.7. */
    izvenQ12: number;
    /** 1.03 Drugi znanstveni članki. Rulebook v2.2 = 0.7. */
    w103: number;
  };
  authorshipPolicy: AuthorshipPolicy;
  customFactors: {
    firstOrCorresponding: number;
    equalOrCo: number;
    otherCoauthor: number;
    unknown: number;
  };
  /** Treat 1.01/1.02 with unknown JCR rank as Q2 baseline (weight 1.0).
   *  v2.2: Q1 = 1.5, Q2 = 1.0, izven = 0.7 — »unknown as Q1/Q2« defaults
   *  to the Q2 weight (1.0). */
  treatUnknownAsQ12: boolean;
  /** Factor applied to weight-1.0 ExtraAchievements (awards, completed mentorships). */
  awardFactor: number;
  /** Factor applied to weight-0.5 ExtraAchievements (editorial-board roles). */
  editorFactor: number;
  /** Factor applied to weight-0.3 ExtraAchievements (special-issue editor). */
  specialIssueFactor: number;

  // ─── Pogoj 2 ─────────────────────────────────────────────────────
  citationSource: CitationSource;
  /** Override the researcher's stored externalProjectsValueEur (null = use stored). */
  externalProjectsValueEurOverride: number | null;

  // ─── Pogoj 3 ─────────────────────────────────────────────────────
  leadershipValueEurOverride: number | null;
  leadershipYearsOverride: number | null;

  // ─── Article 11(6) Open Science ──────────────────────────────────
  /** Required OA ratio 0..1. Rulebook default = 1.0. */
  osThresholdRatio: number;

  // ─── Pragovi (per-title thresholds) ──────────────────────────────
  /** Multiplier applied to every numeric min-threshold. 1.0 = rulebook. */
  thresholdMultiplier: number;
}

export const RULEBOOK_DEFAULT: SimulationConfig = {
  pog1Weights: { q1: 1.5, q2: 1.0, izvenQ12: 0.7, w103: 0.7 },
  authorshipPolicy: 'pravilnik',
  customFactors: {
    firstOrCorresponding: 1.0,
    equalOrCo: 0.7,
    otherCoauthor: 0.3,
    unknown: 0.7,
  },
  treatUnknownAsQ12: false,
  awardFactor: 0.7,
  editorFactor: 0.7,
  specialIssueFactor: 0.7,
  citationSource: 'wos',
  externalProjectsValueEurOverride: null,
  leadershipValueEurOverride: null,
  leadershipYearsOverride: null,
  osThresholdRatio: 1.0,
  thresholdMultiplier: 1.0,
};

/** Kaja's preset: strict first/corr-only, award factor 1.0. */
export const KAJA_STRICT_PRESET: SimulationConfig = {
  ...RULEBOOK_DEFAULT,
  authorshipPolicy: 'strict-first-corr',
  awardFactor: 1.0,
};

/** Kaja's proposed weight schedule (2026-06-12): 1.01/1.02 Q1 = Q2 = 1.5,
 *  izven Q1/Q2 = 1.0; 1.03 = 1.0. Models a proposed rulebook amendment so the
 *  committee can read the point impact — simulation only, weights.ts untouched. */
export const KAJA_WEIGHTS_PRESET: SimulationConfig = {
  ...RULEBOOK_DEFAULT,
  pog1Weights: { q1: 1.5, q2: 1.5, izvenQ12: 1.0, w103: 1.0 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function resolveFactor(
  config: SimulationConfig,
  role: AuthorshipRole | undefined,
): number {
  switch (config.authorshipPolicy) {
    case 'pravilnik':
      return authorshipFactor(role);
    case 'strict-first-corr':
      return role === 'first-or-corresponding' ? 1.0 : 0;
    case 'lenient-all':
      return 1.0;
    case 'custom':
      switch (role) {
        case 'first-or-corresponding':
          return config.customFactors.firstOrCorresponding;
        case 'equal-or-co':
          return config.customFactors.equalOrCo;
        case 'other-coauthor':
          return config.customFactors.otherCoauthor;
        default:
          return config.customFactors.unknown;
      }
  }
}

function resolveWeight(config: SimulationConfig, p: Publication): number {
  const w = config.pog1Weights;
  if (p.typology === '1.01' || p.typology === '1.02') {
    if (p.journalRank === 'Q1') return w.q1;
    if (p.journalRank === 'Q2') return w.q2;
    // No Q1/Q2 tag: optionally treat unknown as the Q2 baseline (conservative
    // vs. Q1); otherwise it falls outside Q1/Q2.
    if (!p.journalRank && config.treatUnknownAsQ12) return w.q2;
    return w.izvenQ12;
  }
  if (p.typology === '1.03') return w.w103;
  return weightFor(p);
}

function resolveCitations(
  r: Researcher,
  source: CitationSource,
): { used: number; label: string } {
  switch (source) {
    case 'wos': {
      const v =
        r.citations?.sicrisWosCleanCitations ?? r.citations?.wosCleanCitations ?? 0;
      return { used: v, label: 'SICRIS WoS' };
    }
    case 'scopus': {
      const v =
        r.citations?.sicrisScopusCleanCitations ??
        r.citations?.scopusCleanCitations ??
        0;
      return { used: v, label: 'SICRIS/Scopus' };
    }
    case 'max-of-two': {
      const wos =
        r.citations?.sicrisWosCleanCitations ?? r.citations?.wosCleanCitations ?? 0;
      const sco =
        r.citations?.sicrisScopusCleanCitations ??
        r.citations?.scopusCleanCitations ??
        0;
      return { used: Math.max(wos, sco), label: 'Maks(WoS, Scopus)' };
    }
  }
}

// ─── Result types ────────────────────────────────────────────────────────

export interface TitleSimulationResult {
  title: Title;
  groupLabel: string;
  stage: TitleCriteria['stage'];
  minEducation: number;
  educationOk: boolean;
  /** Thresholds AFTER applying config.thresholdMultiplier. null when not required. */
  minEquivalents: number | null;
  minCitations: number | null;
  minExternalProjectsValueEur: number | null;
  minLeadershipValueEur: number | null;
  minLeadershipYears: number | null;
  pog1Pass: boolean;
  pog2Pass: boolean;
  pog3Pass: boolean;
  standardsMet: number;
  standardsRequired: number;
  overallPass: boolean;
}

export interface SimulationResult {
  totalEquivalents: number;
  publicationContribution: number;
  awardContribution: number;
  editorContribution: number;
  specialIssueContribution: number;
  /** How many publications were counted (factor > 0). */
  countedPublications: number;
  /** How many publications were skipped because factor = 0 under this policy. */
  skippedPublications: number;
  citationsUsed: number;
  citationSourceLabel: string;
  externalProjectsValueEur: number;
  leadershipValueEur: number;
  leadershipYears: number;
  osTotalCount: number;
  osSatisfiedCount: number;
  osRatio: number;
  osPasses: boolean;
  perTitle: TitleSimulationResult[];
}

export function simulate(
  r: Researcher,
  config: SimulationConfig,
): SimulationResult {
  // ─── Equivalents (Pogoj 1) ──
  let publicationContribution = 0;
  let countedPublications = 0;
  let skippedPublications = 0;
  for (const p of r.publications) {
    const w = resolveWeight(config, p);
    if (w === 0) {
      // Typology not in Annex 3 — matches rulebook behaviour: skip entirely.
      continue;
    }
    const f = resolveFactor(config, p.authorshipRole);
    if (f === 0) {
      skippedPublications += 1;
      continue;
    }
    publicationContribution += w * f;
    countedPublications += 1;
  }
  const ex =
    r.extraAchievements ?? { weight10Count: 0, weight05Count: 0, weight03Count: 0 };
  const awardContribution = ex.weight10Count * 1.0 * config.awardFactor;
  const editorContribution = ex.weight05Count * 0.5 * config.editorFactor;
  const specialIssueContribution =
    ex.weight03Count * 0.3 * config.specialIssueFactor;
  const totalEquivalents =
    Math.round(
      (publicationContribution +
        awardContribution +
        editorContribution +
        specialIssueContribution) *
        100,
    ) / 100;

  // ─── Citations / project value EUR (Pogoj 2) ──
  const cit = resolveCitations(r, config.citationSource);
  const externalProjectsValueEur =
    config.externalProjectsValueEurOverride ??
    r.externalProjectsValueEur ??
    0;

  // ─── Leadership EUR + years (Pogoj 3) ──
  const leadershipValueEur =
    config.leadershipValueEurOverride ??
    r.leadership?.cumulativeValueEur ??
    0;
  const leadershipYears =
    config.leadershipYearsOverride ?? r.leadership?.leadershipYears ?? 0;

  // ─── Open Science (Art 11(6)) ──
  const postOrdinancePubs = r.publications.filter(
    (p) => p.year >= 2024 && /^1\./.test(p.typology),
  );
  let openCount = 0;
  let restrictedCount = 0;
  for (const p of postOrdinancePubs) {
    const state = p.openAccessOverride ?? (p.openAccessAuto ? 'open' : 'closed');
    if (state === 'open') openCount += 1;
    else if (state === 'restricted-not-possible') restrictedCount += 1;
  }
  const osTotalCount = postOrdinancePubs.length;
  const osSatisfiedCount = openCount + restrictedCount;
  const osRatio = osTotalCount === 0 ? 1 : osSatisfiedCount / osTotalCount;
  const osPasses = osRatio >= config.osThresholdRatio;

  // ─── Per-title pass/fail ──
  const eduLevel = r.educationLevel ?? r.inferredEducationLevel ?? 0;
  const mult = config.thresholdMultiplier;
  const perTitle: TitleSimulationResult[] = TITLE_CRITERIA.map((c) => {
    const minEq = c.minEquivalents == null ? null : c.minEquivalents * mult;
    const minCit = c.minCitations == null ? null : c.minCitations * mult;
    const minProjEur =
      c.minExternalProjectsValueEur == null
        ? null
        : c.minExternalProjectsValueEur * mult;
    const minLdEur =
      c.minLeadershipValueEur == null ? null : c.minLeadershipValueEur * mult;
    const minLdYr =
      c.minLeadershipYears == null ? null : c.minLeadershipYears * mult;

    const pog1Pass = minEq == null || totalEquivalents >= minEq;
    const pog2Pass =
      minCit == null && minProjEur == null
        ? true
        : (minCit != null && cit.used >= minCit) ||
          (minProjEur != null && externalProjectsValueEur >= minProjEur);
    const pog3Pass =
      minLdEur == null && minLdYr == null
        ? true
        : (minLdEur != null && leadershipValueEur >= minLdEur) ||
          (minLdYr != null && leadershipYears >= minLdYr);

    const standards = [pog1Pass, pog2Pass, pog3Pass];
    const standardsMet = standards.filter(Boolean).length;
    const educationOk = eduLevel >= c.minEducation;
    // Priloga 2 v2.2: 10 let za III, 15 let za IV. Hard requirement.
    const ysActual = r.yearsInResearchSector ?? 0;
    const workYearsOk =
      c.minYearsInResearchSector == null ||
      ysActual >= c.minYearsInResearchSector;
    const overallPass =
      educationOk &&
      workYearsOk &&
      standardsMet >= c.standardsRequired &&
      osPasses;

    return {
      title: c.title,
      groupLabel: c.groupLabel,
      stage: c.stage,
      minEducation: c.minEducation,
      educationOk,
      minEquivalents: minEq,
      minCitations: minCit,
      minExternalProjectsValueEur: minProjEur,
      minLeadershipValueEur: minLdEur,
      minLeadershipYears: minLdYr,
      pog1Pass,
      pog2Pass,
      pog3Pass,
      standardsMet,
      standardsRequired: c.standardsRequired,
      overallPass,
    };
  });

  return {
    totalEquivalents,
    publicationContribution: Math.round(publicationContribution * 100) / 100,
    awardContribution: Math.round(awardContribution * 100) / 100,
    editorContribution: Math.round(editorContribution * 100) / 100,
    specialIssueContribution: Math.round(specialIssueContribution * 100) / 100,
    countedPublications,
    skippedPublications,
    citationsUsed: cit.used,
    citationSourceLabel: cit.label,
    externalProjectsValueEur,
    leadershipValueEur,
    leadershipYears,
    osTotalCount,
    osSatisfiedCount,
    osRatio,
    osPasses,
    perTitle,
  };
}
