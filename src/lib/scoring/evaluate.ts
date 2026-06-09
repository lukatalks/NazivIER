// Per-title evaluation engine.
// Given a Researcher and a TitleCriteria, returns a detailed pass/fail breakdown.
// Methodology mirrors Pravilnik IER, Priloga 3.

import { authorshipFactor, authorshipLabel } from './authorship';
import { TITLE_CRITERIA, criteriaFor, type TitleCriteria } from './criteria';
import { weightFor } from './weights';

import type { Publication, Researcher, Title } from '@/lib/types';

/** Demo-mode flag for the Open-Science check.
 *
 *  Rationale: the IER rulebook is still a proposal (predlog 26.05.2026); its
 *  Article 11(6) Open-Science clause is not yet enacted. Until enactment we
 *  display the candidate's true OA ratio (so they can plan), but we do not
 *  block eligibility on it. Once the rulebook is adopted set OS_DEMO_PASS=false
 *  (or remove the env var) and the evaluator will enforce 100 % OA strictly. */
const OS_DEMO_PASS =
  (process.env.OS_DEMO_PASS ?? 'true').toLowerCase() !== 'false';

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
  /** True when Article 11(6) is being treated as fulfilled because the
   *  rulebook is still in proposal form (OS_DEMO_PASS env var). */
  openScienceDemoMode: boolean;
  /** Real (strict) Open Science outcome – useful for the UI to surface the
   *  honest ratio while demo mode keeps eligibility unblocked. */
  openScienceStrictlyPassed: boolean;
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
    minExternalProjectsValueFte: half(c.minExternalProjectsValueFte),
    minLeadershipValueFte: half(c.minLeadershipValueFte),
    minLeadershipYears: half(c.minLeadershipYears),
  };
}

/** Format an FTE value in Slovenian locale, e.g. "1,5 FTE". */
function fmtFte(n: number): string {
  return `${n.toLocaleString('sl-SI', {
    minimumFractionDigits: n % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2,
  })} FTE`;
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

  // Pogoj 2: citati ALI kumulativna vrednost projektov izven ARIS (v FTE)
  // Pravilnik IER v2.2, Priloga 3, Pogoj 2. Threshold uses »več kot« — we
  // implement ≥ (inclusive) per the standard interpretation of cumulative
  // thresholds; the difference matters only at exact equality.
  const citPass = c.minCitations != null && cit.used >= c.minCitations;
  const extProjValue = researcher.externalProjectsValueFte ?? 0;
  const projValuePass =
    c.minExternalProjectsValueFte != null &&
    extProjValue >= c.minExternalProjectsValueFte;
  const pog2Pass =
    c.minCitations == null && c.minExternalProjectsValueFte == null
      ? true
      : citPass || projValuePass;
  const pog2: StandardResult = {
    name: 'Pogoj 2',
    description: 'Relevantnost dosežkov ali vodenih projektov',
    passed: pog2Pass,
    evidence:
      c.minCitations == null
        ? `Ni zahtevan za ta naziv.`
        : `Čisti citati (${cit.source === 'none' ? 'ni podatka' : cit.source}): ` +
          `${cit.used} (zahteva ≥ ${c.minCitations}). ` +
          `ALI kumulativna vrednost projektov izven ARIS, ` +
          `pri katerih je kandidat nastopal kot vodja: ` +
          `${fmtFte(extProjValue)} ` +
          `(zahteva ≥ ${fmtFte(c.minExternalProjectsValueFte ?? 0)}). ` +
          (pog2Pass ? '✓ izpolnjen.' : '✗ ni izpolnjen.'),
  };

  // Pogoj 3: zaključeno vodenje
  //
  // Pravilnik IER v2.2, Priloga 3, opens TWO alternative paths:
  //
  //   (a)–(d) Kumulativna vrednost zaključenih vodenih projektov ali
  //           delovnih sklopov v FTE kategorije A v vrednosti, ki je
  //           veljala v letu, ko je bil projekt pridobljen:
  //           ≥ 1 / 5 / 10 FTE (po stopnji).
  //           Seštevek celotnih sredstev (za Inštitut + ostale partnerje) na
  //           projektih, pri katerih je kandidat imel vodilno vlogo na ravni
  //           projekta (ne zgolj na ravni Inštituta).
  //   (e)     Vsaj 1 / 2 / 3 leta opravljanja VODILNE FUNKCIJE,
  //           izčrpno naštete: direktor, predsednik upravnega odbora,
  //           predsednik znanstvenega sveta, vodja programske skupine,
  //           vodja infrastrukturne skupine — na Inštitutu ali enakovredni
  //           instituciji.
  //
  // Pomembno: »leta« iz poti (e) veljajo IZKLJUČNO za zgornjih pet vodilnih
  // funkcij. NE veljajo za leta vodenja raziskovalnih projektov. Zato
  // `ierProjectLeadership.ledYears` (unija intervalov vodenih projektov z
  // ier.si/projekti) NE sme samodejno polniti tega polja — vodenje projekta
  // ≠ vodilna funkcija.
  const ldValueFte = researcher.leadership?.cumulativeValueFte ?? 0;
  const ldYears = researcher.leadership?.leadershipYears ?? 0;
  const pog3Pass =
    c.minLeadershipValueFte == null && c.minLeadershipYears == null
      ? true
      : (c.minLeadershipValueFte != null && ldValueFte >= c.minLeadershipValueFte) ||
        (c.minLeadershipYears != null && ldYears >= c.minLeadershipYears);
  const pog3: StandardResult = {
    name: 'Pogoj 3',
    description: 'Sposobnost vodenja',
    passed: pog3Pass,
    evidence:
      c.minLeadershipValueFte == null
        ? `Ni zahtevan za ta naziv.`
        : `(a–d) Kumulativna vrednost zaključenih vodenih projektov ali ` +
          `delovnih sklopov: ${fmtFte(ldValueFte)} ` +
          `(zahteva ≥ ${fmtFte(c.minLeadershipValueFte ?? 0)}). ` +
          `ALI (e) leta opravljanja vodilne funkcije (direktor, predsednik UO, ` +
          `predsednik ZS, vodja programske ali infrastrukturne skupine): ` +
          `${ldYears} let (zahteva ≥ ${c.minLeadershipYears} let). ` +
          (pog3Pass ? '✓ izpolnjen.' : '✗ ni izpolnjen.'),
  };

  const standards: [StandardResult, StandardResult, StandardResult] = [pog1, pog2, pog3];
  const standardsMet = standards.filter((s) => s.passed).length;

  // Education resolution order – per rulebook the SOK level must be explicit;
  // we never "simulate" it. We do pre-fill the dropdown from the SICRIS name
  // parser so the user starts from a sensible default, but the test below
  // uses the rulebook threshold against whatever value is actually in the
  // researcher record (user override > auto-inferred from dr./mag. > 0).
  const eduLevel =
    researcher.educationLevel ?? researcher.inferredEducationLevel ?? 0;
  const educationOk = eduLevel >= c.minEducation;

  // Delovna doba: pravilnik Priloga 2 has NO »delovna doba« column.
  // The 10/15-let figure comes from Article 14(5) and applies ONLY to
  // predčasna izvolitev — handled inside the early-promotion gate below.
  // Baseline eligibility ignores yearsInResearchSector entirely.
  const ysActual = researcher.yearsInResearchSector ?? 0;

  // Pogoj 1 is always counted toward standards required.
  // For "sodelavec" tier we need 1 of 3; for III/IV we need 2 of 3.
  const eligible = educationOk && standardsMet >= c.standardsRequired;

  // ─── Article 14(5): early-promotion eligibility ────────────────────────
  // Pravilnik IER, Article 14(5). Conditions:
  //   - ≥50 % over the minimum količinski pogoji (measured on equivalents AND
  //     either citations OR external-projects FTE value)
  //   - ≥10 let zaposlitve v raziskovalnem sektorju for stage III,
  //     ≥15 let for stage IV
  //   - applies only to III/IV (lower stages aren't subject to »predčasno«)
  //   - kandidat must also satisfy baseline eligibility
  const ys = ysActual;
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
    const proj15 =
      rawCriteria.minExternalProjectsValueFte != null &&
      (researcher.externalProjectsValueFte ?? 0) >=
        rawCriteria.minExternalProjectsValueFte * 1.5;
    const overshootOk = eqOk && (cit15 || proj15);
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
  // The rulebook requires 100 % open-access coverage for post-Uredba 59/23
  // publications evaluated for promotion. We never "bypass" the check – instead
  // the user can declare additional repository deposits they have already made
  // (but OpenAlex hasn't indexed yet) or will make before the application is
  // reviewed. We add those to the deposited count, cap to the missing total,
  // and recompute the ratio strictly per the rulebook.
  // Recompute Open Science compliance walking through publications so that
  // per-pub user overrides take precedence over OpenAlex's auto-detected OA
  // flag. Article 11(6) explicitly allows »razen kadar to onemogočajo
  // založniške omejitve« – publications tagged 'restricted-not-possible'
  // count as satisfied via the rulebook exemption.
  const postOrdinancePubs = researcher.publications.filter(
    (p) => p.year >= 2024 && /^1\./.test(p.typology),
  );
  let restrictedCount = 0;
  let openCount = 0;
  let closedCount = 0;
  for (const p of postOrdinancePubs) {
    const override = p.openAccessOverride;
    const state: 'open' | 'restricted-not-possible' | 'closed' =
      override ?? (p.openAccessAuto ? 'open' : 'closed');
    if (state === 'open') openCount++;
    else if (state === 'restricted-not-possible') restrictedCount++;
    else closedCount++;
  }
  const recomputedTotal = postOrdinancePubs.length;
  const recomputedSatisfied = openCount + restrictedCount;
  // Fall back to the snapshot's OS stats when we have no walked pubs (e.g.
  // OpenAlex didn't match anything). Keeps backwards compatibility with the
  // earlier OS-summary-driven path.
  const os = researcher.openScienceCompliance;
  const usingWalk = recomputedTotal > 0;
  const osHasData = usingWalk || (!!os && os.postOrdinanceCount > 0);
  const totalCount = usingWalk
    ? recomputedTotal
    : (os?.postOrdinanceCount ?? 0);
  const satisfiedCount = usingWalk
    ? recomputedSatisfied
    : (os?.depositedCount ?? 0);
  const missing = osHasData ? totalCount - satisfiedCount : 0;
  const declared = Math.max(
    0,
    Math.min(researcher.additionalDepositsPlanned ?? 0, missing),
  );
  const adjustedDeposited = osHasData ? satisfiedCount + declared : 0;
  const adjustedRatio = osHasData ? adjustedDeposited / totalCount : 1;
  const strictPass = !osHasData || adjustedRatio === 1;
  // Demo mode: the rulebook is still a draft (predlog 26.05.2026); we do not
  // block eligibility on Article 11(6) until enactment. We still compute and
  // display the candidate's real OA ratio so they know how far along they are.
  // Strict enforcement returns the moment OS_DEMO_PASS env var is set to false.
  const osPass = OS_DEMO_PASS ? true : strictPass;
  const demoSuffix = OS_DEMO_PASS && osHasData && !strictPass
    ? ' (demo način: pogoj je obravnavan kot izpolnjen do uveljavitve pravilnika).'
    : '';
  const restrictedNote =
    usingWalk && restrictedCount > 0
      ? ` Vključenih ${restrictedCount} objav z dokumentirano založniško omejitvijo (izjema iz 11(6) člena).`
      : '';
  const osEv = !osHasData
    ? 'Ni podatkov o odprtem dostopu (Open Science preverjanje preskočeno).'
    : declared > 0 && strictPass
      ? `Uporabnik je deklariral ${declared} dodatnih deponiranj ` +
        `(${satisfiedCount} že prijavljenih + ${declared} ročno = ` +
        `${adjustedDeposited} od ${totalCount}). Pogoj iz 11(6). člena izpolnjen.${restrictedNote}`
      : declared > 0
        ? `${adjustedDeposited} od ${totalCount} po-2023 objav v odprtem dostopu (${Math.round(
            adjustedRatio * 100,
          )} %; vključeno ${declared} deklariranih). Pogoj 11(6) zahteva 100 %.${demoSuffix}${restrictedNote}`
        : strictPass
          ? `Vse vrednotene objave po Uredbi 59/23 (${totalCount}) izpolnjujejo pogoj.${restrictedNote}`
          : `${satisfiedCount} od ${totalCount} po-2023 objav izpolnjuje pogoj (${Math.round(
              adjustedRatio * 100,
            )} %). Manjka ${missing} deponiranj za izpolnitev 11(6). člena.${demoSuffix}${restrictedNote}`;

  const blockingReasons: string[] = [];
  if (!educationOk)
    blockingReasons.push(
      `Izobrazba pod ${c.minEducation}. SOK ravnijo (raziskovalec ima raven ${eduLevel || '?'}).`,
    );
  if (standardsMet < c.standardsRequired)
    blockingReasons.push(
      `Izpolnjenih ${standardsMet} od potrebnih ${c.standardsRequired} pogojev nacionalno/mednarodno primerljivih standardov.`,
    );
  if (osHasData && !strictPass && !OS_DEMO_PASS)
    blockingReasons.push(
      `Po-2023 objave niso vse v odprtem dostopu: manjka ${
        totalCount - adjustedDeposited
      } deponiranj za izpolnitev 11(6). člena.`,
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
    openScienceDemoMode: OS_DEMO_PASS,
    openScienceStrictlyPassed: strictPass,
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
