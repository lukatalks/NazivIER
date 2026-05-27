// Domain types for the IER title-evaluation system.
// All names mirror the rulebook (Pravilnik o raziskovalnih nazivih, IER, 26.05.2026).

export type CareerStage = 'I' | 'II' | 'II-sodelavec' | 'III' | 'IV';

export type TitleGroup = 'znanstveni' | 'strokovno-raziskovalni' | 'razvojni';

export type Title =
  // I. karierna stopnja
  | 'asistent'
  | 'asistent-mag'
  | 'razvijalec'
  | 'visji-razvijalec'
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
}

export interface CitationData {
  /** Web of Science clean citations (čisti citati) — autocitations excluded. */
  wosCleanCitations: number;
  /** Scopus clean citations — fallback if WoS missing. */
  scopusCleanCitations?: number;
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
  /** Project value outside ARIS in FTE (Pogoj 2 alternative). */
  externalProjectsFte?: number;
  /** Counts of achievements that count toward Pogoj 1 equivalents but have no
   *  COBISS typology code, so they cannot come from the SICRIS bibliography
   *  feed and must be entered manually. See Annex 3, Pojasnila k merilom (1). */
  extraAchievements?: ExtraAchievements;
  /** Cached snapshot timestamp */
  fetchedAt?: string;
}

/** Manually-entered, non-typology achievements that contribute to equivalents.
 *  Each is multiplied by the bucket weight (1.0 / 0.5 / 0.3) and the average
 *  authorship factor 0.7 (researcher can flag any of them as first/sole-author
 *  via the UI; for now we just multiply by 0.7 which matches a "co-mentor /
 *  co-editor" type role — conservative and explicit). */
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
  /** Cumulative FTE A-category value of led/coordinated projects/work packages. */
  cumulativeFte: number;
  /** Years in leadership function (director, chair, programme head, infra-group head). */
  leadershipYears: number;
  details?: string;
}
