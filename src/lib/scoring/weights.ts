// Mapping of COBISS typology codes -> achievement weight.
// Source: Pravilnik IER (predlog 05.06.2026, v2.2), Priloga 3,
// "Pojasnila k merilom", točka (1).
//
// Note: 1.01 and 1.02 have CONDITIONAL weights (per v2.2 update):
//   * weight 1.5 if journal is in WoS/Scopus Q1 (i.e. 1A1 in COBISS)
//   * weight 1.0 if journal is in WoS/Scopus Q2 (i.e. 1A2 in COBISS)
//   * weight 0.7 otherwise (izven Q1 ali Q2)
// 2.24 patent s polnim preizkusom = 2.0 (bumped from 1.0 in v2.2).
// All other typology codes have a single weight.

import type { JournalRank, Publication, TypologyCode } from '@/lib/types';

const STATIC_WEIGHTS: Record<TypologyCode, number> = {
  // Weight 2.0 (v2.2: granted patent with full examination)
  '2.24': 2.0, // Podeljen patent s polnim preizkusom

  // Weight 1.0
  '1.16': 1.0, // Samostojni znanstveni sestavek/poglavje v monografiji
  '2.01': 1.0, // Znanstvena monografija

  // Weight 0.7 (1.01/1.02 also 0.7 when not Q1/Q2 – handled dynamically below)
  '1.03': 0.7, // Drugi znanstveni članki
  '1.06': 0.7, // Objavljeni znanstveni prispevek na konferenci (vabljeno)
  '1.07': 0.7, // Objavljeni strokovni prispevek na konferenci (vabljeno)
  '2.03': 0.7, // Univerzitetni / visokošolski / višješolski učbenik z recenzijo
  '2.18': 0.7, // Znanstveni film, znanstvena zvočna ali video publikacija
  '2.21': 0.7, // Programska oprema
  '2.22': 0.7, // Nova sorta
  '2.27': 0.7, // Znanstveni terminološki slovar, enciklopedija, leksikon
  '2.28': 0.7, // Znanstvenokritična izdaja vira
  '2.31': 0.7, // Zbornik recenziranih znanstvenih prispevkov na mednarodni/tuji konferenci

  // Weight 0.5
  '1.10': 0.5, // Objavljeni povzetek znanstvenega prispevka na konferenci (vabljeno)
  '1.11': 0.5, // Objavljeni povzetek strokovnega prispevka na konferenci (vabljeno)
  '2.02': 0.5, // Strokovna monografija
  '2.06': 0.5, // Slovar, enciklopedija, leksikon, priročnik, atlas
  '2.32': 0.5, // Zbornik recenziranih znanstvenih prispevkov na domači konferenci
  '3.14': 0.5, // Predavanje na tuji univerzi
  '3.16': 0.5, // Vabljeno predavanje na konferenci brez natisa

  // Weight 0.3
  '1.04': 0.3, // Strokovni članek
  '1.05': 0.3, // Poljudni članek
  '1.08': 0.3, // Objavljeni znanstveni prispevek na konferenci
  '1.17': 0.3, // Samostojni strokovni sestavek/poglavje
  '1.18': 0.3, // Strokovni sestavek v slovarju/enciklopediji/leksikonu
  '1.26': 0.3, // Znanstveni sestavek v slovarju/enciklopediji/leksikonu
  '2.04': 0.3, // Srednješolski/osnovnošolski/drugi učbenik z recenzijo
  '2.12': 0.3, // Končno poročilo o rezultatih raziskav
  '2.13': 0.3, // Elaborat, predštudija, študija
  '2.15': 0.3, // Izvedensko mnenje, arbitražna odločba
  '2.20': 0.3, // Raziskovalni podatki
  '2.23': 0.3, // Patentna prijava
  '2.30': 0.3, // Zbornik strokovnih/nerecenziranih znanstvenih prispevkov
  '2.33': 0.3, // Strokovni film, videoposnetek, zvočni posnetek

  // Weight 0.1
  '1.09': 0.1, // Objavljeni strokovni prispevek na konferenci
  '1.12': 0.1, // Objavljeni povzetek znanstvenega prispevka na konferenci
  '1.13': 0.1, // Objavljeni povzetek strokovnega prispevka na konferenci
  '1.19': 0.1, // Recenzija, prikaz knjige, kritika
  '1.20': 0.1, // Predgovor, uvodnik, spremna beseda
  '1.21': 0.1, // Polemika, diskusijski prispevek, komentar
  '1.22': 0.1, // Intervju
  '1.24': 0.1, // Bibliografija, kazalo
  '1.25': 0.1, // Drugi sestavni deli
  '2.05': 0.1, // Drugo učno gradivo
  '2.07': 0.1, // Bibliografija
  '2.14': 0.1, // Projektna dokumentacija
  '2.19': 0.1, // Radijska/televizijska oddaja, podkast, intervju
  '2.25': 0.1, // Druge monografije in druga zaključena dela
  '3.11': 0.1, // Radijski/TV dogodek
  '3.12': 0.1, // Razstava
  '3.15': 0.1, // Prispevek na konferenci brez natisa
  '3.25': 0.1, // Druga izvedena dela
};

/**
 * Resolve the weight for a single publication.
 * Returns 0 for typology codes not covered by Annex 3 (they don't count).
 *
 * For 1.01 / 1.02:
 *   * Q1 → 1.5
 *   * Q2 → 1.0
 *   * other (Q3, Q4, not-indexed, unknown) → 0.7
 */
export function weightFor(p: Pick<Publication, 'typology' | 'journalRank'>): number {
  if (p.typology === '1.01' || p.typology === '1.02') {
    if (p.journalRank === 'Q1') return 1.5;
    if (p.journalRank === 'Q2') return 1.0;
    return 0.7;
  }
  return STATIC_WEIGHTS[p.typology] ?? 0;
}

export function isQ1OrQ2(rank?: JournalRank): boolean {
  return rank === 'Q1' || rank === 'Q2';
}

/** Human-readable description of which weight bucket a publication falls into. */
export function weightBucketLabel(weight: number): string {
  if (weight === 2.0) return 'Vrhunska (2,0)';
  if (weight === 1.5) return 'Najvišja (1,5)';
  if (weight === 1.0) return 'Visoka (1,0)';
  if (weight === 0.7) return 'Srednja (0,7)';
  if (weight === 0.5) return 'Srednja (0,5)';
  if (weight === 0.3) return 'Nižja (0,3)';
  if (weight === 0.1) return 'Najnižja (0,1)';
  return 'Ne šteje (0)';
}
