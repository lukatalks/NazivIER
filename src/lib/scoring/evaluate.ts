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
  /** Per Article 14(5): candidate qualifies for EARLY promotion when they
   *  exceed the minimum thresholds by ≥50 % AND have served ≥10 years
   *  (for III) or ≥15 years (for IV) in the research sector. */
  earlyPromotionEligible: boolean;
  /** Why early-promotion was/wasn't granted (human-readable). */
  earlyPromotionEvidence: string;
  /** Per Article 11(6): for post-2023 publications evaluated for promotion,
   *  candidate must guarantee open access through repository deposit. */
  openSciencePassed: boolean;
  openScienceEvidence: string;
  /** Re-election flag echoed for the UI. */
  isReelection: boolean;
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('sl-SI', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Compute the equivalents sum and per-pub contributions for a researcher.
 *  Returns both the sum and per-publication breakdown (sorted descending by
 *  contribution). Includes manual "extraAchievements" entries (PhD mentorships,
 *  science awards, editorial-board roles, special-issue editorships) that have
 *  no COBISS typology code – see types.ts for the rationale. Those entries
 *  count at the bucket weight × 0.7 authorship factor (co-author/co-editor
 *  baseline) and are not listed in the `contributions` table (they have no
 *  publication record). They are added to the total only. */
export function computeEquivalents(r: Researcher): {
  total: number;
  contributions: EquivalentContribution[];
  extra: { weight10: number; weight05: number; weight03: number; subtotal: number };
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

  // Non-typology achievements (Annex 3, Pojasnila k merilom – text entries that
  // appear in the weight table without a COBISS code). Each counts at its
  // bucket weight × 0.7 (the conservative co-author/co-editor baseline).
  const ex = r.extraAchievements ?? { weight10Count: 0, weight05Count: 0, weight03Count: 0 };
  const baseline = 0.7;
  const eqW10 = ex.weight10Count * 1.0 * baseline;
  const eqW05 = ex.weight05Count * 0.5 * baseline;
  const eqW03 = ex.weight03Count * 0.3 * baseline;
  const extraSubtotal = eqW10 + eqW05 + eqW03;
  total += extraSubtotal;

  contributions.sort((a, b) => b.equivalent - a.equivalent);
  return {
    total,
    contributions,
    extra: {
      weight10: eqW10,
      weight05: eqW05,
      weight03: eqW03,
      subtotal: extraSubtotal,
    },
  };
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

/** Apply Article 22(2): on re-election to the same title the candidate must
 *  meet at least HALF of the values required at the first election. We model
 *  this by halving every numeric threshold; everything else (standardsRequired,
 *  minEducation) stays. */
function applyReelection(c: TitleCriteria): TitleCriteria {
  const half = (n: number | null) => (n == null ? n : n / 2);
  return {
    ...c,
    minEquivalents: half(c.minEquivalents),
    minCitations: half(c.minCitations),
    minExternalProjectsFte: half(c.minExternalProjectsFte),
    minLeadershipFte: half(c.minLeadershipFte),
    minLeadershipYears: half(c.minLeadershipYears),
  };
}

/** Evaluate the researcher against a single title. */
export function evaluateForTitle(researcher: Researcher, title: Title): TitleEvaluation {
  const rawCriteria = criteriaFor(title);
  if (!rawCriteria) throw new Error(`Unknown title: ${title}`);
  const c = researcher.isReelection ? applyReelection(rawCriteria) : rawCriteria;

  const { total: totalEquivalents, contributions, extra } = computeEquivalents(researcher);
  const cit = pickCitations(researcher);

  // Pogoj 1: Objavljeni dosežki
  const pog1Pass = c.minEquivalents == null || totalEquivalents >= c.minEquivalents;
  const extraNote =
    extra.subtotal > 0
      ? ` Vključuje ${fmt(extra.subtotal)} ekvivalentov ` +
        `iz ročno vnesenih dosežkov brez tipologije (mentorstva, nagrade, uredništva).`
      : '';
  const pog1: StandardResult = {
    name: 'Pogoj 1',
    description: 'Objavljeni dosežki',
    passed: pog1Pass,
    evidence:
      c.minEquivalents == null
        ? `Ni zahtevan za ta naziv.`
        : `Doseženo ${fmt(totalEquivalents)} ekvivalentov ` +
          `(zahtevano ${c.minEquivalents}). ` +
          `Vsota uteži × faktorja avtorstva za vse publikacije s tipologijo iz priloge 3.` +
          extraNote,
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

  // ─── Article 14(5): early-promotion eligibility ────────────────────────
  // Conditions:
  //   - ≥50 % over the minimum thresholds (we measure equivalents AND
  //     citations OR external-projects FTE)
  //   - ≥10 yrs research sector for stage III, ≥15 yrs for stage IV
  //   - applies only to III/IV (lower stages aren't subject to "predčasno")
  const ys = researcher.yearsInResearchSector ?? 0;
  const stage = rawCriteria.stage;
  const yearsMin = stage === 'III' ? 10 : stage === 'IV' ? 15 : 0;
  let earlyEligible = false;
  let earlyEv = 'Ni v okviru predčasne izvolitve (samo III. in IV. karierna stopnja).';
  if (stage === 'III' || stage === 'IV') {
    const yearsOk = ys >= yearsMin;
    const eqOk =
      rawCriteria.minEquivalents != null && totalEquivalents >= rawCriteria.minEquivalents * 1.5;
    const cit15 =
      rawCriteria.minCitations != null && cit.used >= rawCriteria.minCitations * 1.5;
    const fte15 =
      rawCriteria.minExternalProjectsFte != null &&
      (researcher.externalProjectsFte ?? 0) > rawCriteria.minExternalProjectsFte * 1.5;
    const overshootOk = eqOk && (cit15 || fte15);
    earlyEligible = yearsOk && overshootOk && eligible;
    earlyEv = earlyEligible
      ? `Upravičen do predčasne izvolitve: vsaj 50 % nad minimumom (${fmt(
          totalEquivalents,
        )} eq vs ${rawCriteria.minEquivalents}) in ${ys} let v raziskovalnem sektorju (zahtevano ≥ ${yearsMin}).`
      : `Ni upravičen do predčasne izvolitve: ${
          !yearsOk
            ? `samo ${ys} let v raziskovalnem sektorju (zahtevano ≥ ${yearsMin})`
            : `ne presega minimuma za 50 %`
        }.`;
  }

  // ─── Article 11(6): Open Science check ─────────────────────────────────
  // We pass when either no OS data is loaded OR every post-2023 evaluated
  // publication has open access (is_oa true in OpenAlex).
  const os = researcher.openScienceCompliance;
  const osHasData = os && os.postOrdinanceCount > 0;
  const osPass = !osHasData || os.fullyCompliant;
  const osEv = !osHasData
    ? 'Ni podatkov o odprtem dostopu (Open Science preverjanje preskočeno).'
    : os.fullyCompliant
      ? `Vse vrednotene objave po Uredbi 59/23 (${os.postOrdinanceCount}) so v odprtem dostopu.`
      : `${os.depositedCount} od ${os.postOrdinanceCount} po-2023 objav v odprtem dostopu (${Math.round(
          os.ratio * 100,
        )} %). Pogoj iz 11(6). člena ni v celoti izpolnjen.`;

  const blockingReasons: string[] = [];
  if (!educationOk)
    blockingReasons.push(
      `Izobrazba pod ${c.minEducation}. SOK ravnijo (raziskovalec ima raven ${eduLevel || '?'}).`,
    );
  if (standardsMet < c.standardsRequired)
    blockingReasons.push(
      `Izpolnjenih ${standardsMet} od potrebnih ${c.standardsRequired} pogojev nacionalno/mednarodno primerljivih standardov.`,
    );
  if (osHasData && !osPass)
    blockingReasons.push(
      `Po-2023 objave niso vse v odprtem dostopu (11. člen, 6. odstavek).`,
    );

  return {
    title,
    groupLabel: c.groupLabel,
    stage: c.stage,
    eligible: eligible && osPass,
    educationOk,
    standards,
    standardsMet,
    standardsRequired: c.standardsRequired,
    totalEquivalents,
    contributions,
    citationsUsed: cit.used,
    citationSource: cit.source,
    blockingReasons,
    earlyPromotionEligible: earlyEligible,
    earlyPromotionEvidence: earlyEv,
    openSciencePassed: osPass,
    openScienceEvidence: osEv,
    isReelection: !!researcher.isReelection,
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

// Highest-to-lowest order per group. After sodelavec we fall through to the
// asistent tier so the UI can still surface "highest eligible" for someone who
// hasn't crossed the sodelavec threshold yet.
const GROUP_ORDER: Title[][] = [
  [
    'znanstveni-svetnik',
    'visji-znanstveni-sodelavec',
    'znanstveni-sodelavec',
    'asistent-dr',
    'asistent-mag',
    'asistent',
  ],
  [
    'strokovno-raziskovalni-svetnik',
    'visji-strokovno-raziskovalni-sodelavec',
    'strokovno-raziskovalni-sodelavec',
    'visji-strokovno-raziskovalni-asistent',
    'asistent-srr',
  ],
  [
    'razvojni-svetnik',
    'visji-razvojni-sodelavec',
    'razvojni-sodelavec',
    'samostojni-razvijalec',
    'visji-razvijalec',
    'razvijalec',
  ],
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
