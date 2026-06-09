// Domain types for the IER title-evaluation system.
// All names mirror the rulebook (Pravilnik o raziskovalnih nazivih, IER, 26.05.2026).

export type CareerStage = 'I' | 'II' | 'II-sodelavec' | 'III' | 'IV';

export type TitleGroup = 'znanstveni' | 'strokovno-raziskovalni' | 'razvojni';

export type Title =
  // I. karierna stopnja – asistentska
  | 'asistent'
  | 'asistent-mag'
  | 'razvijalec'
  | 'visji-razvijalec'
  // I. karierna stopnja – strokovno-raziskovalna asistentska
  | 'asistent-srr'
  | 'visji-asistent-srr'
  // II. karierna stopnja - prva polovica (asistenti z doktoratom)
  | 'asistent-dr'
  | 'visji-strokovno-raziskovalni-asistent'
  | 'samostojni-razvijalec'
  // II. karierna stopnja - druga polovica (sodelavci)
  | 'znanstveni-sodelavec'
  | 'strokovno-raziskovalni-sodelavec'
  | 'razvojni-sodelavec'
  // III. karierna stopnja
  | 'visji-znanstveni-sodelavec'
  | 'visji-strokovno-raziskovalni-sodelavec'
  | 'visji-razvojni-sodelavec'
  // IV. karierna stopnja
  | 'znanstveni-svetnik'
  | 'strokovno-raziskovalni-svetnik'
  | 'razvojni-svetnik';

export type EducationLevel = 8 | 9 | 10;

export type TypologyCode = string; // e.g. '1.01', '1.02', '2.01'

export type AuthorshipRole = 'first-or-corresponding' | 'equal-or-co' | 'other-coauthor';

/** Per-publication Open Access status override.
 *
 *  Article 11(6) of the IER rulebook explicitly carves out an exemption when
 *  publisher restrictions make open access impossible (»razen kadar to
 *  onemogočajo založniške omejitve«). So a publication can satisfy the OS
 *  requirement in two ways:
 *    'open'                    – deposited in repository / publisher open
 *    'restricted-not-possible' – publisher embargo or similar restriction
 *  And one failing state:
 *    'closed'                  – no open access and no documented restriction
 *
 *  When the user sets an override we use it instead of the OpenAlex `is_oa`
 *  flag; the override defaults to undefined which means "trust OpenAlex". */
export type OpenAccessStatus = 'open' | 'restricted-not-possible' | 'closed';

export type JournalRank = 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'indexed-other' | 'not-indexed' | 'unknown';

export interface Publication {
  /** COBISS bibliographic ID */
  id: string;
  title: string;
  parentTitle?: string;
  year: number;
  /** COBISS typology code, e.g. "1.01", "1.16", "2.01" */
  typology: TypologyCode;
  typologyDescr?: string;
  /** Q1/Q2 = 1A1/1A2 in COBISS ARIS marker. Set via SICRIS eval feed or OpenAlex lookup. */
  journalRank?: JournalRank;
  /** Authorship role (used for the avtorstvo factor). Default 'equal-or-co' when unknown. */
  authorshipRole?: AuthorshipRole;
  /** Whether indexed in SSCI/Scopus (only matters when typology is 1.01/1.02 and not Q1/Q2). */
  indexedSsciScopus?: boolean;
  /** Auto-detected OA flag from OpenAlex `open_access.is_oa` when the work matched. */
  openAccessAuto?: boolean;
  /** User-declared OA status. When set, overrides openAccessAuto for the Article
   *  11(6) compliance calculation. Accepts the three rulebook states. */
  openAccessOverride?: OpenAccessStatus;
}

export interface CitationData {
  /** Primary citation number used for the rulebook Pogoj 2 check. Prefers
   *  SICRIS "čisti citati po WoS" (the figure ARIS reviewers see) when the
   *  SICRIS scrape succeeds; falls back to OpenAlex (broader-coverage,
   *  self-citation-stripped) when SICRIS is unavailable. */
  wosCleanCitations: number;
  /** Scopus clean citations – fallback if WoS missing. */
  scopusCleanCitations?: number;
  /** SICRIS-sourced figures (what an ARIS/IER reviewer would quote). */
  sicrisWosCleanCitations?: number;
  sicrisScopusCleanCitations?: number;
  sicrisHIndexWos?: number;
  sicrisHIndexScopus?: number;
  /** OpenAlex-sourced figures (broader coverage diagnostic). */
  openAlexCleanCitations?: number;
  openAlexHIndex?: number;
  /** Which source is currently driving the rulebook citation check. */
  primarySource?: 'sicris-wos' | 'openalex' | 'manual' | 'none';
}

export interface Researcher {
  /** SICRIS researcher ID (ARIS code), e.g. 33182 for Kaja Primc */
  sicrisId: string;
  fullName: string;
  educationLevel?: EducationLevel;
  /** Total years of service in the research sector. */
  yearsInResearchSector?: number;
  /** Optional ORCID id */
  orcid?: string;
  publications: Publication[];
  citations: CitationData;
  /** Leadership achievements (Pogoj 3 in Annex 3). */
  leadership?: LeadershipRecord;
  /** Project value outside ARIS in EUR (Pogoj 2 alternative).
   *  Per Pravilnik v2.2 (05.06.2026): cumulative value of projects outside
   *  ARIS where candidate had leading role (vodja projekta / vodilna vloga),
   *  in EUR. Replaces former FTE-based metric. */
  externalProjectsValueEur?: number;
  /** Counts of achievements that count toward Pogoj 1 equivalents but have no
   *  COBISS typology code, so they cannot come from the SICRIS bibliography
   *  feed and must be entered manually. See Annex 3, Pojasnila k merilom (1). */
  extraAchievements?: ExtraAchievements;
  /** Re-election flag (Article 22(2)): when set, all numeric Annex-3 thresholds
   *  are halved because the rule requires "at least half the values" since the
   *  previous election in the same title. */
  isReelection?: boolean;
  /** Open Science compliance per Article 11(6). Each evaluated post-2023 publication
   *  must be deposited in an institutional or thematic repository (open access). */
  openScienceCompliance?: OpenScienceCompliance;
  /** User-declared additional Open-Science deposits the candidate either has
   *  already lodged (but OpenAlex has not yet picked up) or will lodge before
   *  the application is reviewed. We add this to the deposited count and
   *  recompute the ratio strictly per Article 11(6): the threshold is still
   *  100 % coverage of post-2024 evaluated publications, never bypassed.
   *  Capped to the missing count so the user can't claim more than reality. */
  additionalDepositsPlanned?: number;
  /** Auto-inferred SOK level from the SICRIS name parser. Used as a fallback
   *  when educationLevel is not set by the user. */
  inferredEducationLevel?: EducationLevel;
  /** Auto-scraped IER leadership rollup. When present and the user hasn't
   *  manually overridden `leadership`, the evaluator uses these counts so
   *  Pogoj 3 reflects the institute's own record without retyping. */
  ierProjectLeadership?: IerProjectLeadershipSummary;
  /** Cached snapshot timestamp */
  fetchedAt?: string;
}

/** Lightweight snapshot of the researcher's leadership footprint on
 *  https://www.ier.si/projekti/ – used to pre-fill Pogoj 3 evidence. */
export interface IerProjectLeadershipSummary {
  ledCount: number;
  /** Decimal years derived from the union of led-project intervals. */
  ledYears: number;
  /** Count of led projects whose Naročnik isn't ARIS – informs Pogoj 2
   *  "vrednost projektov izven ARIS" evidence (FTE values still manual). */
  ledExternalCount: number;
  /** Brief project summaries surfaced in the UI as evidence. */
  led: Array<{
    title: string;
    funder?: string;
    code?: string;
    startDate?: string;
    endDate?: string;
    projectType: string;
    url: string;
  }>;
  sourceUrl: string;
}

/** Article 11(6) Open Science: for publications evaluated for promotion that
 *  were created after the 59/23 ordinance took effect, the candidate must
 *  guarantee open access through institutional/thematic-repository deposit. */
export interface OpenScienceCompliance {
  /** Number of post-2023 publications evaluated. */
  postOrdinanceCount: number;
  /** How many of them are deposited (open-access detected via OpenAlex is_oa). */
  depositedCount: number;
  /** Compliance ratio 0–1 (depositedCount / postOrdinanceCount, or 1 if none). */
  ratio: number;
  /** True when every post-2023 evaluated publication has open access. */
  fullyCompliant: boolean;
}

/** Manually-entered, non-typology achievements that contribute to equivalents.
 *  Each is multiplied by the bucket weight (1.0 / 0.5 / 0.3) and the average
 *  authorship factor 0.7 (researcher can flag any of them as first/sole-author
 *  via the UI; for now we just multiply by 0.7 which matches a "co-mentor /
 *  co-editor" type role – conservative and explicit). */
export interface ExtraAchievements {
  /** Weight 1.0: completed PhD mentorships + national/international science
   *  awards (Zois, Zois recognition, Excellent in Science, intl research awards). */
  weight10Count: number;
  /** Weight 0.5: journal-editorial-board memberships + completed leadership of
   *  domestic/foreign research projects/programmes (separate from project FTE). */
  weight05Count: number;
  /** Weight 0.3: special-issue editorships (uredništvo posebne številke). */
  weight03Count: number;
}

export interface LeadershipRecord {
  /** Cumulative EUR value of led/coordinated projects or work packages.
   *  Per Pravilnik v2.2 (05.06.2026), Priloga 3, Pogoj 3, paths (a)–(d):
   *  sum of total project values (for the Institute AND other partners) on
   *  projects where the candidate had a leading role at PROJECT level (not
   *  only at Institute level). Replaces former FTE-based metric. */
  cumulativeValueEur: number;
  /** Years in leadership function (director, chair, programme head, infra-group head). */
  leadershipYears: number;
  details?: string;
}
