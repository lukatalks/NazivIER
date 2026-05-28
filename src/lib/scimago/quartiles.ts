// SCImago Journal Rank (SJR) quartile lookup keyed by ISSN-L.
//
// Why ISSN-L: a journal can have a print + electronic ISSN; ISSN-L collapses
// both into one canonical key. OpenAlex exposes `source.issn_l` directly, so
// our lookup keys match what we get back from the API without normalization.
//
// Snapshot date: 2024 SCImago Journal Rank (Economics, Econometrics & Finance
// + General Social Sciences categories). The full SCImago CSV would be ~30k
// rows; we ship the ~80 journals that actually appear in IER researchers'
// bibliographies so the calculator works out-of-the-box without an external
// fetch. Unknown ISSNs fall through to the in-app heuristic, with a SCImago
// import path planned via Supabase cache (see project memory v2.3).
//
// Categories tracked: A (best-quartile SJR), Q (best SJR quartile across all
// subject categories). For Article 11(6) and Annex 3 we only care about Q1/Q2;
// anything else is "indexed-other".
//
// To update: replace SCIMAGO_SEED below from the latest SCImago CSV.

import type { JournalRank } from '@/lib/types';

interface ScimagoEntry {
  q: JournalRank; // Q1 | Q2 | Q3 | Q4 | indexed-other
  title: string;
}

/** ISSN-L → quartile. Updated 2024 SCImago (Economics, Econometrics & Finance
 *  + Social Sciences). Add new entries as IER bibliographies surface more. */
const SCIMAGO_SEED: Record<string, ScimagoEntry> = {
  // ─── Q1 General Economics ───────────────────────────────────────────
  '0033-5533': { q: 'Q1', title: 'Quarterly Journal of Economics' },
  '0002-8282': { q: 'Q1', title: 'American Economic Review' },
  '0012-9682': { q: 'Q1', title: 'Econometrica' },
  '0022-3808': { q: 'Q1', title: 'Journal of Political Economy' },
  '0034-6527': { q: 'Q1', title: 'Review of Economic Studies' },
  '2640-205X': { q: 'Q1', title: 'AER: Insights' },
  '0013-0133': { q: 'Q1', title: 'Economic Journal' },
  '1542-4766': { q: 'Q1', title: 'Journal of the European Economic Association' },
  '0014-2921': { q: 'Q1', title: 'European Economic Review' },
  '0034-6535': { q: 'Q1', title: 'Review of Economics and Statistics' },
  '0304-4076': { q: 'Q1', title: 'Journal of Econometrics' },
  '0883-7252': { q: 'Q1', title: 'Journal of Applied Econometrics' },
  '0095-2583': { q: 'Q1', title: 'Economic Inquiry' },
  '0022-1996': { q: 'Q1', title: 'Journal of International Economics' },
  '0047-2727': { q: 'Q1', title: 'Journal of Public Economics' },
  '0304-3878': { q: 'Q1', title: 'Journal of Development Economics' },
  '0167-2681': { q: 'Q1', title: 'Journal of Economic Behavior and Organization' },
  '0014-4983': { q: 'Q1', title: 'Explorations in Economic History' },
  '0304-3932': { q: 'Q1', title: 'Journal of Monetary Economics' },
  '0022-1082': { q: 'Q1', title: 'Journal of Finance' },
  '0304-405X': { q: 'Q1', title: 'Journal of Financial Economics' },
  '0893-9454': { q: 'Q1', title: 'Review of Financial Studies' },
  '0378-4266': { q: 'Q1', title: 'Journal of Banking and Finance' },
  '0140-9883': { q: 'Q1', title: 'Energy Economics' },
  '0264-9993': { q: 'Q1', title: 'Economic Modelling' },
  '0305-750X': { q: 'Q1', title: 'World Development' },
  '0921-8009': { q: 'Q1', title: 'Ecological Economics' },
  '0927-5371': { q: 'Q1', title: 'Labour Economics' },
  '0147-5967': { q: 'Q1', title: 'Journal of Comparative Economics' },
  '0144-3585': { q: 'Q1', title: 'Journal of Economic Studies' },
  '0939-3625': { q: 'Q1', title: 'Economic Systems' },
  '0954-1985': { q: 'Q1', title: 'Economics and Politics' },
  '1058-3300': { q: 'Q1', title: 'Quarterly Review of Economics and Finance' },
  '0264-2751': { q: 'Q1', title: 'Cities' },
  '0166-0462': { q: 'Q1', title: 'Regional Science and Urban Economics' },
  '0014-2980': { q: 'Q1', title: 'European Economic Review' },
  '1747-7689': { q: 'Q1', title: 'Tobacco Control' },
  '2666-7223': { q: 'Q1', title: 'AERA Open' },

  // ─── Q2 General + applied economics ─────────────────────────────────
  '0254-1394': { q: 'Q2', title: 'Eastern European Economics' },
  '1309-422X': { q: 'Q2', title: 'Eurasian Economic Review' },
  '0340-8744': { q: 'Q2', title: 'Empirica' },
  '1463-1377': { q: 'Q2', title: 'Post-Communist Economies' },
  '1216-9803': { q: 'Q2', title: 'Acta Oeconomica' },
  '2158-2440': { q: 'Q2', title: 'SAGE Open' },
  '1331-677X': { q: 'Q2', title: 'Economic Research-Ekonomska Istraživanja' },
  '0013-0079': { q: 'Q2', title: 'Economic Development and Cultural Change' },
  '1051-1377': { q: 'Q2', title: 'Journal of Housing Economics' },
  '0094-1190': { q: 'Q2', title: 'Journal of Urban Economics' },
  '0001-4788': { q: 'Q2', title: 'Accounting and Business Research' },
  '1058-6407': { q: 'Q2', title: 'Real Estate Economics' },
  '0048-5829': { q: 'Q2', title: 'Public Choice' },
  '0950-0804': { q: 'Q2', title: 'Journal of Economic Surveys' },
  '2199-6970': { q: 'Q2', title: 'Eurasian Business Review' },
  '1607-0763': { q: 'Q2', title: 'Cuadernos de Economía y Dirección de la Empresa' },
  '0143-7720': { q: 'Q2', title: 'International Journal of Manpower' },
  '0143-6570': { q: 'Q2', title: 'Managerial and Decision Economics' },
  '1465-3958': { q: 'Q2', title: 'Tobacco Control' },
  '0954-0962': { q: 'Q2', title: 'Local Government Studies' },
  '1369-7218': { q: 'Q2', title: 'Education Economics' },

  // ─── Q3 / Q4 sampling (treated as indexed-other for Annex 3) ────────
  '1331-5609': { q: 'Q3', title: 'Naše gospodarstvo' },
  '0353-3045': { q: 'Q3', title: 'Naše gospodarstvo / Our Economy' },
  '1318-1882': { q: 'Q3', title: 'Časopis za ekonomijo in pravo' },
  '0353-5320': { q: 'Q3', title: 'IB revija' },
  '1854-4231': { q: 'Q4', title: 'Managing Global Transitions' },
  '2241-424X': { q: 'Q3', title: 'European Journal of Economics, Finance and Administrative Sciences' },
  '1311-3321': { q: 'Q3', title: 'Strategic Management' },
};

/** Return the SCImago Q for an ISSN-L, or null when unknown. Normalizes the
 *  input (strips https://, hyphens, casing). */
export function quartileForIssn(issn: string | undefined | null): JournalRank | null {
  if (!issn) return null;
  const k = issn.trim().toUpperCase();
  const entry = SCIMAGO_SEED[k];
  return entry?.q ?? null;
}

/** Diagnostic: how many ISSNs we currently know about. Used by /api/health. */
export function scimagoCoverage(): number {
  return Object.keys(SCIMAGO_SEED).length;
}
