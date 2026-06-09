// Per-title threshold table – Pravilnik IER (predlog 05.06.2026, v2.2),
// Priloga 2 in Priloga 3.
//
// For each "sodelavec"-and-above title we record:
//   * minimum education level (8/9/10 SOK)
//   * required number of national/international standards met (0/1/2)
//   * minimum equivalents (Pogoj 1)
//   * minimum citations OR minimum external-project value in EUR (Pogoj 2)
//   * leadership requirements (Pogoj 3) – cumulative EUR value OR years in leadership
//
// v2.2 changes (05.06.2026, per email Kaja Primc):
//   * Pogoj 2 and Pogoj 3 switched from FTE to EUR values.
//   * Pogoj 1 thresholds bumped (znanstveni: 5/20/40; razvojni: 5/15/35).
//   * Pogoj 2 citation thresholds for III/IV bumped (znanstveni: 200/400).

import type { EducationLevel, Title } from '@/lib/types';

export interface TitleCriteria {
  title: Title;
  groupLabel: string;
  stage: 'I' | 'II' | 'III' | 'IV';
  minEducation: EducationLevel;
  /** Number of Annex-3 standards that must be met (0/1/2). */
  standardsRequired: 0 | 1 | 2;
  // Pogoj 1: equivalents – null when not required
  minEquivalents: number | null;
  // Pogoj 2 – null when not required (e.g. titles below sodelavec)
  minCitations: number | null;
  /** Minimum cumulative value (EUR) of projects outside ARIS where candidate
   *  had a leading role. Per v2.2: znanstveni/strokovno-raziskovalni paths
   *  20k/150k/300k EUR; razvojni same thresholds but interpreted as funding
   *  outside ARIS budget where candidate had leading role at the Institute. */
  minExternalProjectsValueEur: number | null;
  // Pogoj 3 – leadership thresholds, null when not required
  /** Minimum cumulative value (EUR) of led/coordinated projects + work
   *  packages. Per v2.2 paths (a)–(d): 50k/250k/500k EUR. */
  minLeadershipValueEur: number | null;
  minLeadershipYears: number | null;
  /** Optional minimum years of service in the research sector (only set for III/IV when early promotion). */
  minYearsInResearchSector?: number;
}

// Helper to produce one row.
function row(c: TitleCriteria): TitleCriteria {
  return c;
}

export const TITLE_CRITERIA: TitleCriteria[] = [
  // ─── I. karierna stopnja – ASISTENTI ─────────────────────────────
  // Per Pravilnik Annex 2: I-stage titles have no bibliometric standards –
  // only education level matters (SOK 8/9/10). Evaluator still runs the three
  // Pogoji for completeness; they're informational, not blocking.
  row({
    title: 'asistent',
    groupLabel: 'Asistent / asistentka (znanstveni)',
    stage: 'I',
    minEducation: 8,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueEur: null,
    minLeadershipValueEur: null,
    minLeadershipYears: null,
  }),
  row({
    title: 'asistent-mag',
    groupLabel: 'Asistent z magisterijem znanosti / asistentka z magisterijem znanosti',
    stage: 'I',
    minEducation: 9,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueEur: null,
    minLeadershipValueEur: null,
    minLeadershipYears: null,
  }),
  row({
    title: 'asistent-srr',
    groupLabel: 'Asistent / asistentka (strokovno-raziskovalni)',
    stage: 'I',
    minEducation: 8,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueEur: null,
    minLeadershipValueEur: null,
    minLeadershipYears: null,
  }),
  row({
    title: 'visji-asistent-srr',
    groupLabel: 'Višji asistent / višja asistentka (strokovno-raziskovalni)',
    stage: 'I',
    minEducation: 9,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueEur: null,
    minLeadershipValueEur: null,
    minLeadershipYears: null,
  }),
  row({
    title: 'razvijalec',
    groupLabel: 'Razvijalec / razvijalka',
    stage: 'I',
    minEducation: 8,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueEur: null,
    minLeadershipValueEur: null,
    minLeadershipYears: null,
  }),
  row({
    title: 'visji-razvijalec',
    groupLabel: 'Višji razvijalec / višja razvijalka',
    stage: 'I',
    minEducation: 8,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueEur: null,
    minLeadershipValueEur: null,
    minLeadershipYears: null,
  }),

  // ─── II. karierna stopnja – ASISTENT Z DOKTORATOM ────────────────
  // Doctorate required (SOK 10) – no bibliometric standards still per Annex 2.
  row({
    title: 'asistent-dr',
    groupLabel: 'Asistent z doktoratom / asistentka z doktoratom',
    stage: 'II',
    minEducation: 10,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueEur: null,
    minLeadershipValueEur: null,
    minLeadershipYears: null,
  }),
  row({
    title: 'visji-strokovno-raziskovalni-asistent',
    groupLabel: 'Višji strokovno-raziskovalni asistent / višja strokovno-raziskovalna asistentka',
    stage: 'II',
    minEducation: 10,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueEur: null,
    minLeadershipValueEur: null,
    minLeadershipYears: null,
  }),
  row({
    title: 'samostojni-razvijalec',
    groupLabel: 'Samostojni razvijalec / samostojna razvijalka',
    stage: 'II',
    minEducation: 8,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueEur: null,
    minLeadershipValueEur: null,
    minLeadershipYears: null,
  }),

  // ─── ZNANSTVENI ─── II.b sodelavec
  // v2.2: equivalents 3→5, projects 20.000 EUR, leadership 50.000 EUR / 1 year.
  row({
    title: 'znanstveni-sodelavec',
    groupLabel: 'Znanstveni sodelavec / znanstvena sodelavka',
    stage: 'II',
    minEducation: 10,
    standardsRequired: 1,
    minEquivalents: 5,
    minCitations: 10,
    minExternalProjectsValueEur: 20_000,
    minLeadershipValueEur: 50_000,
    minLeadershipYears: 1,
  }),
  // III. višji znanstveni sodelavec
  // v2.2: equivalents 10→20, citations 100→200, projects 150.000 EUR,
  // leadership 250.000 EUR / 2 years.
  row({
    title: 'visji-znanstveni-sodelavec',
    groupLabel: 'Višji znanstveni sodelavec / višja znanstvena sodelavka',
    stage: 'III',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 20,
    minCitations: 200,
    minExternalProjectsValueEur: 150_000,
    minLeadershipValueEur: 250_000,
    minLeadershipYears: 2,
  }),
  // IV. znanstveni svetnik
  // v2.2: equivalents 18→40, citations 200→400, projects 300.000 EUR,
  // leadership 500.000 EUR / 3 years.
  row({
    title: 'znanstveni-svetnik',
    groupLabel: 'Znanstveni svetnik / znanstvena svetnica',
    stage: 'IV',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 40,
    minCitations: 400,
    minExternalProjectsValueEur: 300_000,
    minLeadershipValueEur: 500_000,
    minLeadershipYears: 3,
  }),

  // ─── STROKOVNO-RAZISKOVALNI ─── (same Annex-3 numbers as znanstveni)
  row({
    title: 'strokovno-raziskovalni-sodelavec',
    groupLabel: 'Strokovno-raziskovalni sodelavec / strokovno-raziskovalna sodelavka',
    stage: 'II',
    minEducation: 10,
    standardsRequired: 1,
    minEquivalents: 5,
    minCitations: 10,
    minExternalProjectsValueEur: 20_000,
    minLeadershipValueEur: 50_000,
    minLeadershipYears: 1,
  }),
  row({
    title: 'visji-strokovno-raziskovalni-sodelavec',
    groupLabel: 'Višji strokovno-raziskovalni sodelavec / višja strokovno-raziskovalna sodelavka',
    stage: 'III',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 20,
    minCitations: 200,
    minExternalProjectsValueEur: 150_000,
    minLeadershipValueEur: 250_000,
    minLeadershipYears: 2,
  }),
  row({
    title: 'strokovno-raziskovalni-svetnik',
    groupLabel: 'Strokovno-raziskovalni svetnik / strokovno-raziskovalna svetnica',
    stage: 'IV',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 40,
    minCitations: 400,
    minExternalProjectsValueEur: 300_000,
    minLeadershipValueEur: 500_000,
    minLeadershipYears: 3,
  }),

  // ─── RAZVOJNI ───
  // v2.2: razvojni Pogoj 1 = 5 / 15 / 35; citations 5 / 50 / 200;
  // project EUR same as znanstveni; leadership EUR same.
  row({
    title: 'razvojni-sodelavec',
    groupLabel: 'Razvojni sodelavec / razvojna sodelavka',
    stage: 'II',
    minEducation: 8,
    standardsRequired: 1,
    minEquivalents: 5,
    minCitations: 5,
    minExternalProjectsValueEur: 20_000,
    minLeadershipValueEur: 50_000,
    minLeadershipYears: 1,
  }),
  row({
    title: 'visji-razvojni-sodelavec',
    groupLabel: 'Višji razvojni sodelavec / višja razvojna sodelavka',
    stage: 'III',
    minEducation: 8,
    standardsRequired: 2,
    minEquivalents: 15,
    minCitations: 50,
    minExternalProjectsValueEur: 150_000,
    minLeadershipValueEur: 250_000,
    minLeadershipYears: 2,
  }),
  row({
    title: 'razvojni-svetnik',
    groupLabel: 'Razvojni svetnik / razvojna svetnica',
    stage: 'IV',
    minEducation: 9,
    standardsRequired: 2,
    minEquivalents: 35,
    minCitations: 200,
    minExternalProjectsValueEur: 300_000,
    minLeadershipValueEur: 500_000,
    minLeadershipYears: 3,
  }),
];

export function criteriaFor(title: Title): TitleCriteria | undefined {
  return TITLE_CRITERIA.find((c) => c.title === title);
}
