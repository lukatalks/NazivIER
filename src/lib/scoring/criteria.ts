// Per-title threshold table — Pravilnik IER, Priloga 2 in Priloga 3.
//
// For each "sodelavec"-and-above title we record:
//   * minimum education level (8/9/10 SOK)
//   * required number of national/international standards met (0/1/2)
//   * minimum equivalents (Pogoj 1)
//   * minimum citations OR minimum external-project FTE (Pogoj 2)
//   * leadership requirements (Pogoj 3) — cumulative FTE OR years in leadership

import type { EducationLevel, Title } from '@/lib/types';

export interface TitleCriteria {
  title: Title;
  groupLabel: string;
  stage: 'I' | 'II' | 'III' | 'IV';
  minEducation: EducationLevel;
  /** Number of Annex-3 standards that must be met (0/1/2). */
  standardsRequired: 0 | 1 | 2;
  // Pogoj 1: equivalents — null when not required
  minEquivalents: number | null;
  // Pogoj 2 — null when not required (e.g. titles below sodelavec)
  minCitations: number | null;
  minExternalProjectsFte: number | null;
  // Pogoj 3 — leadership thresholds, null when not required
  minLeadershipFte: number | null;
  minLeadershipYears: number | null;
  /** Optional minimum years of service in the research sector (only set for III/IV when early promotion). */
  minYearsInResearchSector?: number;
}

// Helper to produce one row.
function row(c: TitleCriteria): TitleCriteria {
  return c;
}

export const TITLE_CRITERIA: TitleCriteria[] = [
  // ─── ZNANSTVENI ─── II.b sodelavec
  row({
    title: 'znanstveni-sodelavec',
    groupLabel: 'Znanstveni sodelavec',
    stage: 'II',
    minEducation: 10,
    standardsRequired: 1,
    minEquivalents: 3,
    minCitations: 10,
    minExternalProjectsFte: 0.5,
    minLeadershipFte: 1,
    minLeadershipYears: 1,
  }),
  // III. višji znanstveni sodelavec
  row({
    title: 'visji-znanstveni-sodelavec',
    groupLabel: 'Višji znanstveni sodelavec',
    stage: 'III',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 10,
    minCitations: 100,
    minExternalProjectsFte: 3,
    minLeadershipFte: 5,
    minLeadershipYears: 2,
  }),
  // IV. znanstveni svetnik
  row({
    title: 'znanstveni-svetnik',
    groupLabel: 'Znanstveni svetnik',
    stage: 'IV',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 18,
    minCitations: 200,
    minExternalProjectsFte: 5,
    minLeadershipFte: 10,
    minLeadershipYears: 3,
  }),

  // ─── STROKOVNO-RAZISKOVALNI ─── (same equivalents/citations as scientific per Annex 3)
  row({
    title: 'strokovno-raziskovalni-sodelavec',
    groupLabel: 'Strokovno-raziskovalni sodelavec',
    stage: 'II',
    minEducation: 10,
    standardsRequired: 1,
    minEquivalents: 3,
    minCitations: 10,
    minExternalProjectsFte: 0.5,
    minLeadershipFte: 1,
    minLeadershipYears: 1,
  }),
  row({
    title: 'visji-strokovno-raziskovalni-sodelavec',
    groupLabel: 'Višji strokovno-raziskovalni sodelavec',
    stage: 'III',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 10,
    minCitations: 100,
    minExternalProjectsFte: 3,
    minLeadershipFte: 5,
    minLeadershipYears: 2,
  }),
  row({
    title: 'strokovno-raziskovalni-svetnik',
    groupLabel: 'Strokovno-raziskovalni svetnik',
    stage: 'IV',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 18,
    minCitations: 200,
    minExternalProjectsFte: 5,
    minLeadershipFte: 10,
    minLeadershipYears: 3,
  }),

  // ─── RAZVOJNI ───
  row({
    title: 'razvojni-sodelavec',
    groupLabel: 'Razvojni sodelavec',
    stage: 'II',
    minEducation: 8,
    standardsRequired: 1,
    minEquivalents: 2,
    minCitations: 5,
    minExternalProjectsFte: 0.5,
    minLeadershipFte: 1,
    minLeadershipYears: 1,
  }),
  row({
    title: 'visji-razvojni-sodelavec',
    groupLabel: 'Višji razvojni sodelavec',
    stage: 'III',
    minEducation: 8,
    standardsRequired: 2,
    minEquivalents: 5,
    minCitations: 50,
    minExternalProjectsFte: 3,
    minLeadershipFte: 5,
    minLeadershipYears: 2,
  }),
  row({
    title: 'razvojni-svetnik',
    groupLabel: 'Razvojni svetnik',
    stage: 'IV',
    minEducation: 9,
    standardsRequired: 2,
    minEquivalents: 18,
    minCitations: 200,
    minExternalProjectsFte: 5,
    minLeadershipFte: 10,
    minLeadershipYears: 3,
  }),
];

export function criteriaFor(title: Title): TitleCriteria | undefined {
  return TITLE_CRITERIA.find((c) => c.title === title);
}
