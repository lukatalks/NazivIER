// Per-title evaluation engine.
// Given a Researcher and a TitleCriteria, returns a detailed pass/fail breakdown.
// Methodology mirrors Pravilnik IER, Priloga 3.

import { authorshipFactor, authorshipLabel } from './authorship';
import { TITLE_CRITERIA, criteriaFor, type TitleCriteria } from './criteria';
import { weightFor } from './weights';

import type { Publication, Researcher, Title } from '@/lib/types';

export interface EquivalentContribution {
  publication: Publication;
  weight: number;
  authorshipFactor: number;
  equivalent: number;
}

export interface StandardResult {
  /** "Pogoj 1 / 2 / 3" in Slovenian */
  name: string;
  /** Short description shown next to the verdict. */
  description: string;
  passed: boolean;
  /** Human-readable explanation of how the value was computed. */
  evidence: string;
}

export interface TitleEvaluation {
  title: Title;
  groupLabel: string;
  stage: TitleCriteria['stage'];
  eligible: boolean;
  /** Education check. */
  educationOk: boolean;
  /** All three standards, regardless of how many were required. */
  standards: [StandardResult, StandardResult, StandardResult];
  /** How many standards were met. */
  standardsMet: number;
  /** How many standards are required for this title. */
  standardsRequired: number;
  /** Total equivalents (Pogoj 1 value), even if not required. */
  totalEquivalents: number;
  /** Per-publication contribution used in the equivalents sum. */
  contributions: EquivalentContribution[];
  /** Citation count actually used (WoS clean, falls back to Scopus clean). */
  citationsUsed: number;
  citationSource: 'WoS' | 'Scopus' | 'none';
  blockingReasons: string[];
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('sl-SI', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Compute the equivalents sum and per-pub contributions for a researcher. */
export function computeEquivalents(r: Researcher): {
  total: number;
  contributions: EquivalentContribution[];
} {
  const contributions: EquivalentContribution[] = [];
  let total = 0;
  for (const pub of r.publications) {
    const w = weightFor(pub);
    if (w === 0) continue;
    const f = authorshipFactor(pub.authorshipRole);
    const eq = w * f;
    contributions.push({
      publication: pub,
      weight: w,
      authorshipFactor: f,
      equivalent: eq,
    });
    total += eq;
  }
  // Sort descending by contribution so the UI shows top items first.
  contributions.sort((a, b) => b.equivalent - a.equivalent);
  return { total, contributions };
}

function pickCitations(r: Researcher): {
  used: number;
  source: 'WoS' | 'Scopus' | 'none';
} {
  const wos = r.citations?.wosCleanCitations ?? 0;
  if (wos > 0) return { used: wos, source: 'WoS' };
  const scopus = r.citations?.scopusCleanCitations ?? 0;
  if (scopus > 0) return { used: scopus, source: 'Scopus' };
  return { used: 0, source: 'none' };
}

/** Evaluate the researcher against a single title. */
export function evaluateForTitle(researcher: Researcher, title: Title): TitleEvaluation {
  const c = criteriaFor(title);
  if (!c) throw new Error(`Unknown title: ${title}`);

  const { total: totalEquivalents, contributions } = computeEquivalents(researcher);
  const cit = pickCitations(researcher);

  // Pogoj 1: Objavljeni dosežki
  const pog1Pass = c.minEquivalents == null || totalEquivalents >= c.minEquivalents;
  const pog1: StandardResult = {
    name: 'Pogoj 1',
    description: 'Objavljeni dosežki',
    passed: pog1Pass,
    evidence:
      c.minEquivalents == null
        ? `Ni zahtevan za ta naziv.`
        : `Doseženo ${fmt(totalEquivalents)} ekvivalentov ` +
          `(zahtevano ${c.minEquivalents}). ` +
          `Vsota uteži × faktorja avtorstva za vse publikacije s tipologijo iz priloge 3.`,
  };

  // Pogoj 2: citati ALI vrednost projektov izven ARIS
  const citPass = c.minCitations != null && cit.used >= c.minCitations;
  const ftePass =
    c.minExternalProjectsFte != null &&
    (researcher.externalProjectsFte ?? 0) > c.minExternalProjectsFte;
  const pog2Pass =
    c.minCitations == null && c.minExternalProjectsFte == null
      ? true
      : citPass || ftePass;
  const pog2: StandardResult = {
    name: 'Pogoj 2',
    description: 'Relevantnost dosežkov ali vodenih projektov',
    passed: pog2Pass,
    evidence:
      c.minCitations == null
        ? `Ni zahtevan za ta naziv.`
        : `Citati (${cit.source === 'none' ? 'ni podatka' : cit.source}): ` +
          `${cit.used} (zahteva ≥ ${c.minCitations}). ` +
          `ALI vrednost projektov izven ARIS: ` +
          `${fmt(researcher.externalProjectsFte ?? 0)} FTE ` +
          `(zahteva > ${c.minExternalProjectsFte} FTE). ` +
          (pog2Pass ? '✓ izpolnjen.' : '✗ ni izpolnjen.'),
  };

  // Pogoj 3: zaključeno vodenje
  const ldFte = researcher.leadership?.cumulativeFte ?? 0;
  const ldYears = researcher.leadership?.leadershipYears ?? 0;
  const pog3Pass =
    c.minLeadershipFte == null && c.minLeadershipYears == null
      ? true
      : (c.minLeadershipFte != null && ldFte >= c.minLeadershipFte) ||
        (c.minLeadershipYears != null && ldYears >= c.minLeadershipYears);
  const pog3: StandardResult = {
    name: 'Pogoj 3',
    description: 'Sposobnost vodenja',
    passed: pog3Pass,
    evidence:
      c.minLeadershipFte == null
        ? `Ni zahtevan za ta naziv.`
        : `Kumulativna vrednost vodenih projektov: ${fmt(ldFte)} FTE ` +
          `(zahteva ≥ ${c.minLeadershipFte} FTE) ALI ` +
          `vodilna funkcija: ${ldYears} let ` +
          `(zahteva ≥ ${c.minLeadershipYears} let). ` +
          (pog3Pass ? '✓ izpolnjen.' : '✗ ni izpolnjen.'),
  };

  const standards: [StandardResult, StandardResult, StandardResult] = [pog1, pog2, pog3];
  const standardsMet = standards.filter((s) => s.passed).length;

  // Education
  const eduLevel = researcher.educationLevel ?? 0;
  const educationOk = eduLevel >= c.minEducation;

  // Pogoj 1 is always counted toward standards required.
  // For "sodelavec" tier we need 1 of 3; for III/IV we need 2 of 3.
  const eligible = educationOk && standardsMet >= c.standardsRequired;

  const blockingReasons: string[] = [];
  if (!educationOk)
    blockingReasons.push(
      `Izobrazba pod ${c.minEducation}. SOK ravnijo (raziskovalec ima raven ${eduLevel || '?'}).`,
    );
  if (standardsMet < c.standardsRequired)
    blockingReasons.push(
      `Izpolnjenih ${standardsMet} od potrebnih ${c.standardsRequired} pogojev nacionalno/mednarodno primerljivih standardov.`,
    );

  return {
    title,
    groupLabel: c.groupLabel,
    stage: c.stage,
    eligible,
    educationOk,
    standards,
    standardsMet,
    standardsRequired: c.standardsRequired,
    totalEquivalents,
    contributions,
    citationsUsed: cit.used,
    citationSource: cit.source,
    blockingReasons,
  };
}

/** Evaluate the researcher against every title and return the list. */
export function evaluateAll(researcher: Researcher): TitleEvaluation[] {
  return TITLE_CRITERIA.map((c) => evaluateForTitle(researcher, c.title));
}

/** Highest title the researcher is eligible for, per group. */
export interface HighestPerGroup {
  znanstveni?: TitleEvaluation;
  'strokovno-raziskovalni'?: TitleEvaluation;
  razvojni?: TitleEvaluation;
}

const GROUP_ORDER: Title[][] = [
  ['znanstveni-svetnik', 'visji-znanstveni-sodelavec', 'znanstveni-sodelavec'],
  [
    'strokovno-raziskovalni-svetnik',
    'visji-strokovno-raziskovalni-sodelavec',
    'strokovno-raziskovalni-sodelavec',
  ],
  ['razvojni-svetnik', 'visji-razvojni-sodelavec', 'razvojni-sodelavec'],
];

export function highestEligible(evaluations: TitleEvaluation[]): HighestPerGroup {
  const byTitle = new Map(evaluations.map((e) => [e.title, e]));
  const result: HighestPerGroup = {};
  const groupKeys = ['znanstveni', 'strokovno-raziskovalni', 'razvojni'] as const;
  GROUP_ORDER.forEach((titles, idx) => {
    for (const t of titles) {
      const ev = byTitle.get(t);
      if (ev?.eligible) {
        result[groupKeys[idx]] = ev;
        return;
      }
    }
  });
  return result;
}

export { authorshipLabel };
