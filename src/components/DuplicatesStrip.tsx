'use client';

// Possible-duplicates diagnostic (v2.7).
//
// The IER rulebook is silent on de-duplication and the methodology trusts
// COBISS typology as the source of truth (»upoštevajoč tipologijo
// dokumentov/del za vodenje bibliografij v sistemu Cobiss«). Annex 3 sums
// every catalogued record once at its weight – we do not (and must not)
// silently drop records.
//
// HOWEVER the SICRIS bibliography sometimes catalogues the same intellectual
// contribution under multiple records (e.g. conference paper + journal
// version, SL + EN translation, preprint + final). The Article 12
// »kakovostni pogoji« review then asks the commission to judge whether the
// duplicates represent genuinely distinct outputs or a cataloguing issue.
//
// This strip surfaces title collisions to the reviewer **without touching
// the score**, so they can flag them to the commission during qualitative
// review. The COBISS librarian still owns cataloguing hygiene.
//
// Per Luka 2026-05-28: »list titles appearing more than once so reviewers
// can flag them for the commission« – does not alter scores.

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import { weightFor } from '@/lib/scoring/weights';
import { authorshipFactor } from '@/lib/scoring/authorship';

import type { Publication } from '@/lib/types';

interface Props {
  publications: Publication[];
}

interface DuplicateGroup {
  normalisedTitle: string;
  /** Title shown to the user (canonical = the first / longest one). */
  displayTitle: string;
  instances: Publication[];
  /** Sum of equivalents these records contribute today (for context). */
  totalEquivalent: number;
}

export function DuplicatesStrip({ publications }: Props) {
  const t = useTranslations('duplicates');
  const [open, setOpen] = useState(false);

  const groups = findDuplicates(publications);
  if (groups.length === 0) return null;

  const totalDupRecords = groups.reduce((acc, g) => acc + g.instances.length, 0);
  const totalEqContribution = groups.reduce((acc, g) => acc + g.totalEquivalent, 0);

  return (
    <section className="rounded-lg border border-[var(--warn)] bg-[var(--warn-bg)]/40 p-3 sm:p-4 text-xs">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <strong className="font-semibold text-[var(--warn)]">{t('title')}</strong>{' '}
          <span className="text-[var(--muted)]">
            {t('summary', {
              groups: groups.length,
              records: totalDupRecords,
              eq: totalEqContribution.toLocaleString('sl-SI', {
                maximumFractionDigits: 2,
              }),
            })}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="text-[var(--accent)] underline-offset-2 hover:underline"
        >
          {open ? t('hide') : t('show')}
        </button>
      </header>

      {open ? (
        <>
          <p className="mt-2 text-[var(--muted)] leading-relaxed">{t('disclaimer')}</p>
          <div className="mt-3 space-y-3">
            {groups.map((g) => (
              <div
                key={g.normalisedTitle}
                className="rounded-md border border-[var(--border)] bg-white/70 dark:bg-black/30 p-2.5"
              >
                <div className="font-medium text-sm">{g.displayTitle}</div>
                <table className="mt-2 w-full">
                  <thead className="text-[var(--muted)]">
                    <tr className="border-b border-[var(--border)]/60 text-left">
                      <th className="py-1 pr-3">{t('th.year')}</th>
                      <th className="py-1 pr-3">{t('th.typology')}</th>
                      <th className="py-1 pr-3">{t('th.cobissId')}</th>
                      <th className="py-1 pr-3">{t('th.weight')}</th>
                      <th className="py-1 pr-3 text-right">{t('th.equivalent')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.instances.map((p) => {
                      const w = weightFor(p);
                      const a = authorshipFactor(p.authorshipRole);
                      const eq = w * a;
                      return (
                        <tr
                          key={p.id}
                          className="border-b border-[var(--border)]/30"
                        >
                          <td className="py-1 pr-3 tabnum">{p.year || '–'}</td>
                          <td className="py-1 pr-3 font-mono">{p.typology}</td>
                          <td className="py-1 pr-3 font-mono">{p.id}</td>
                          <td className="py-1 pr-3 tabnum">
                            {w.toLocaleString('sl-SI', { maximumFractionDigits: 1 })}
                          </td>
                          <td className="py-1 pr-3 text-right tabnum">
                            {eq.toLocaleString('sl-SI', { maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

/** Group publications by normalised title. Returns groups with >1 instances,
 *  sorted by descending equivalent contribution so reviewers see the most
 *  impactful collisions first. */
export function findDuplicates(publications: Publication[]): DuplicateGroup[] {
  const byKey = new Map<string, Publication[]>();
  for (const p of publications) {
    if (!p.title) continue;
    const key = normaliseTitle(p.title);
    if (!key) continue;
    const list = byKey.get(key) ?? [];
    list.push(p);
    byKey.set(key, list);
  }
  const groups: DuplicateGroup[] = [];
  for (const [key, list] of byKey) {
    if (list.length < 2) continue;
    // Display the longest title variant – usually the most complete.
    const displayTitle = list.reduce(
      (best, p) => (p.title.length > best.length ? p.title : best),
      list[0].title,
    );
    const totalEquivalent = list.reduce((acc, p) => {
      return acc + weightFor(p) * authorshipFactor(p.authorshipRole);
    }, 0);
    groups.push({
      normalisedTitle: key,
      displayTitle,
      instances: list.sort((a, b) => (b.year || 0) - (a.year || 0)),
      totalEquivalent,
    });
  }
  return groups.sort((a, b) => b.totalEquivalent - a.totalEquivalent);
}

/** Normalise a title for collision detection: lowercase, strip diacritics +
 *  punctuation, collapse whitespace. Same shape as the OpenAlex title-match
 *  normaliser in sicris/client.ts so duplicates surface consistently. */
function normaliseTitle(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}
