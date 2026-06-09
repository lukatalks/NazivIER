// Per-title threshold table — Pravilnik IER (predlog 05.06.2026, v2.2),
// Priloga 2 in Priloga 3.
//
// For each "sodelavec"-and-above title we record:
//   * minimum education level (8/9/10 SOK)
//   * required number of national/international standards met (0/1/2)
//   * minimum equivalents (Pogoj 1)
//   * minimum citations OR minimum external-project value in FTE (Pogoj 2)
//   * leadership thresholds (Pogoj 3) — cumulative FTE value OR years in
//     »vodilna funkcija«
//
// v3.0.0 revision (2026-06-09) — source-of-truth re-read of pravilnik.docx:
//   * Pogoj 1 znanstveni: 3 / 10 / 18 ekvivalentov (was wrongly 5 / 20 / 40)
//   * Pogoj 1 razvojni: 2 / 5 / 18 ekvivalentov (was wrongly 5 / 15 / 35)
//   * Pogoj 2 znanstveni citations: 10 / 100 / 200 (was wrongly 10 / 200 / 400)
//   * Pogoj 2 razvojni citations: 5 / 50 / 200 (unchanged in pravilnik)
//   * Pogoj 2 alt + Pogoj 3 reverted from EUR to FTE (pravilnik never said
//     EUR — earlier v2.8 change-set was based on a misread).
//     Pogoj 2 alt FTE: 0,5 / 3 / 5; Pogoj 3 FTE: 1 / 5 / 10.
//   * `minYearsInResearchSector` set to null for ALL titles. Pravilnik Priloga 2
//     does NOT contain a »delovna doba« column. The 10/15 years requirement
//     comes from Article 14(5) and applies ONLY to early/predčasna izvolitev
//     (handled inside evaluate.ts), not to baseline eligibility.

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
  /** Minimum cumulative value (FTE) of projects outside ARIS where candidate
   *  had a leading role. Pravilnik Priloga 3, Pogoj 2, ALI-veja:
   *  znanstveni/strokovno-raziskovalni 0,5 / 3 / 5 FTE;
   *  razvojni 0,5 / 3 / 5 FTE. */
  minExternalProjectsValueFte: number | null;
  // Pogoj 3 — leadership thresholds, null when not required
  /** Minimum cumulative value (FTE) of led/coordinated projects + work
   *  packages (paths a–d). Pravilnik: znanstveni 1 / 5 / 10 FTE;
   *  razvojni 1 / 5 / 10 FTE (kategorija A v vrednosti, ki je veljala
   *  v letu, ko je bil projekt pridobljen). */
  minLeadershipValueFte: number | null;
  /** Years in »vodilna funkcija« (path e): direktor, predsednik UO,
   *  predsednik ZS, vodja programske / infrastrukturne skupine. */
  minLeadershipYears: number | null;
  /** Minimum years of service in the research sector. Always null in v3.0.0
   *  — this is NOT a Priloga 2 baseline requirement. The 10/15-let figure
   *  from Article 14(5) is used solely inside the early-promotion gate. */
  minYearsInResearchSector: number | null;
}

// Helper to produce one row.
function row(c: TitleCriteria): TitleCriteria {
  return c;
}

export const TITLE_CRITERIA: TitleCriteria[] = [
  // ─── I. karierna stopnja — ASISTENTI ─────────────────────────────
  // Per Pravilnik Annex 2: I-stage titles have no bibliometric standards —
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
    minExternalProjectsValueFte: null,
    minLeadershipValueFte: null,
    minLeadershipYears: null,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'asistent-mag',
    groupLabel: 'Asistent z magisterijem znanosti / asistentka z magisterijem znanosti',
    stage: 'I',
    minEducation: 9,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueFte: null,
    minLeadershipValueFte: null,
    minLeadershipYears: null,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'asistent-srr',
    groupLabel: 'Asistent / asistentka (strokovno-raziskovalni)',
    stage: 'I',
    minEducation: 8,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueFte: null,
    minLeadershipValueFte: null,
    minLeadershipYears: null,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'visji-asistent-srr',
    groupLabel: 'Višji asistent / višja asistentka (strokovno-raziskovalni)',
    stage: 'I',
    minEducation: 9,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueFte: null,
    minLeadershipValueFte: null,
    minLeadershipYears: null,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'razvijalec',
    groupLabel: 'Razvijalec / razvijalka',
    stage: 'I',
    minEducation: 8,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueFte: null,
    minLeadershipValueFte: null,
    minLeadershipYears: null,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'visji-razvijalec',
    groupLabel: 'Višji razvijalec / višja razvijalka',
    stage: 'I',
    minEducation: 8,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueFte: null,
    minLeadershipValueFte: null,
    minLeadershipYears: null,
    minYearsInResearchSector: null,
  }),

  // ─── II. karierna stopnja — ASISTENT Z DOKTORATOM ────────────────
  // Doctorate required (SOK 10) — no bibliometric standards still per Annex 2.
  row({
    title: 'asistent-dr',
    groupLabel: 'Asistent z doktoratom / asistentka z doktoratom',
    stage: 'II',
    minEducation: 10,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueFte: null,
    minLeadershipValueFte: null,
    minLeadershipYears: null,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'visji-strokovno-raziskovalni-asistent',
    groupLabel: 'Višji strokovno-raziskovalni asistent / višja strokovno-raziskovalna asistentka',
    stage: 'II',
    minEducation: 10,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueFte: null,
    minLeadershipValueFte: null,
    minLeadershipYears: null,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'samostojni-razvijalec',
    groupLabel: 'Samostojni razvijalec / samostojna razvijalka',
    stage: 'II',
    minEducation: 8,
    standardsRequired: 0,
    minEquivalents: null,
    minCitations: null,
    minExternalProjectsValueFte: null,
    minLeadershipValueFte: null,
    minLeadershipYears: null,
    minYearsInResearchSector: null,
  }),

  // ─── ZNANSTVENI ─── II.b sodelavec
  // Pravilnik: 3 ekvivalenti, 10 citatov ALI 0,5 FTE, 1 FTE ALI 1 leto.
  row({
    title: 'znanstveni-sodelavec',
    groupLabel: 'Znanstveni sodelavec / znanstvena sodelavka',
    stage: 'II',
    minEducation: 10,
    standardsRequired: 1,
    minEquivalents: 3,
    minCitations: 10,
    minExternalProjectsValueFte: 0.5,
    minLeadershipValueFte: 1,
    minLeadershipYears: 1,
    minYearsInResearchSector: null,
  }),
  // III. višji znanstveni sodelavec
  // Pravilnik: 10 ekvivalentov, 100 citatov ALI 3 FTE, 5 FTE ALI 2 leti.
  row({
    title: 'visji-znanstveni-sodelavec',
    groupLabel: 'Višji znanstveni sodelavec / višja znanstvena sodelavka',
    stage: 'III',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 10,
    minCitations: 100,
    minExternalProjectsValueFte: 3,
    minLeadershipValueFte: 5,
    minLeadershipYears: 2,
    minYearsInResearchSector: null,
  }),
  // IV. znanstveni svetnik
  // Pravilnik: 18 ekvivalentov, 200 citatov ALI 5 FTE, 10 FTE ALI 3 leta.
  row({
    title: 'znanstveni-svetnik',
    groupLabel: 'Znanstveni svetnik / znanstvena svetnica',
    stage: 'IV',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 18,
    minCitations: 200,
    minExternalProjectsValueFte: 5,
    minLeadershipValueFte: 10,
    minLeadershipYears: 3,
    minYearsInResearchSector: null,
  }),

  // ─── STROKOVNO-RAZISKOVALNI ─── (same Annex-3 numbers as znanstveni)
  row({
    title: 'strokovno-raziskovalni-sodelavec',
    groupLabel: 'Strokovno-raziskovalni sodelavec / strokovno-raziskovalna sodelavka',
    stage: 'II',
    minEducation: 10,
    standardsRequired: 1,
    minEquivalents: 3,
    minCitations: 10,
    minExternalProjectsValueFte: 0.5,
    minLeadershipValueFte: 1,
    minLeadershipYears: 1,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'visji-strokovno-raziskovalni-sodelavec',
    groupLabel: 'Višji strokovno-raziskovalni sodelavec / višja strokovno-raziskovalna sodelavka',
    stage: 'III',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 10,
    minCitations: 100,
    minExternalProjectsValueFte: 3,
    minLeadershipValueFte: 5,
    minLeadershipYears: 2,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'strokovno-raziskovalni-svetnik',
    groupLabel: 'Strokovno-raziskovalni svetnik / strokovno-raziskovalna svetnica',
    stage: 'IV',
    minEducation: 10,
    standardsRequired: 2,
    minEquivalents: 18,
    minCitations: 200,
    minExternalProjectsValueFte: 5,
    minLeadershipValueFte: 10,
    minLeadershipYears: 3,
    minYearsInResearchSector: null,
  }),

  // ─── RAZVOJNI ───
  // Pravilnik: Pogoj 1 = 2 / 5 / 18; citations 5 / 50 / 200;
  // Pogoj 2 FTE alt same as znanstveni (0,5 / 3 / 5); Pogoj 3 FTE same
  // (1 / 5 / 10) and years 1 / 2 / 3.
  row({
    title: 'razvojni-sodelavec',
    groupLabel: 'Razvojni sodelavec / razvojna sodelavka',
    stage: 'II',
    minEducation: 8,
    standardsRequired: 1,
    minEquivalents: 2,
    minCitations: 5,
    minExternalProjectsValueFte: 0.5,
    minLeadershipValueFte: 1,
    minLeadershipYears: 1,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'visji-razvojni-sodelavec',
    groupLabel: 'Višji razvojni sodelavec / višja razvojna sodelavka',
    stage: 'III',
    minEducation: 8,
    standardsRequired: 2,
    minEquivalents: 5,
    minCitations: 50,
    minExternalProjectsValueFte: 3,
    minLeadershipValueFte: 5,
    minLeadershipYears: 2,
    minYearsInResearchSector: null,
  }),
  row({
    title: 'razvojni-svetnik',
    groupLabel: 'Razvojni svetnik / razvojna svetnica',
    stage: 'IV',
    minEducation: 9,
    standardsRequired: 2,
    minEquivalents: 18,
    minCitations: 200,
    minExternalProjectsValueFte: 5,
    minLeadershipValueFte: 10,
    minLeadershipYears: 3,
    minYearsInResearchSector: null,
  }),
];

export function criteriaFor(title: Title): TitleCriteria | undefined {
  return TITLE_CRITERIA.find((c) => c.title === title);
}
