'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { authorshipLabel } from '@/lib/scoring/authorship';
import type { TitleEvaluation } from '@/lib/scoring/evaluate';
import { weightBucketLabel } from '@/lib/scoring/weights';

interface Props {
  evaluation: TitleEvaluation;
  defaultExpanded?: boolean;
}

export function EvaluationCard({ evaluation: e, defaultExpanded = false }: Props) {
  const t = useTranslations('evalCard');
  const locale = useLocale();
  const [expanded, setExpanded] = useState(defaultExpanded);
  // Per-card collapse for the contributions table (v2.7.1, per Luka).
  // The verdict (blocking reasons + Pogoj cards) stays visible when the
  // card is expanded; only the long per-publication table is hidden behind
  // a separate »prikaži razčlenitev« click. Keeps the card body scannable
  // and removes the wall-of-rows feel when reviewers expand multiple
  // titles in a group.
  const [contribOpen, setContribOpen] = useState(false);

  const numLocale = locale === 'sl' ? 'sl-SI' : 'en-GB';
  const fmt = (n: number, decimals = 2) =>
    n.toLocaleString(numLocale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

  return (
    <article
      className="rounded-lg border bg-white dark:bg-black/20"
      style={{ borderColor: e.eligible ? 'var(--success)' : 'var(--border)' }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabnum"
              style={{
                background: e.eligible ? 'var(--success-bg)' : 'var(--muted-bg)',
                color: e.eligible ? 'var(--success)' : 'var(--muted)',
              }}
            >
              {e.eligible ? t('eligible') : t('ineligible')}
            </span>
            <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
              {t('stageLabel', { stage: e.stage })}
            </span>
          </div>
          <h3 className="mt-1 text-lg font-semibold">{e.groupLabel}</h3>
          <p className="text-sm text-[var(--muted)]">
            {t('standards', {
              met: e.standardsMet,
              required: e.standardsRequired,
              eq: fmt(e.totalEquivalents),
              source: e.citationSource === 'none' ? t('noData') : e.citationSource,
              cit: e.citationsUsed,
            })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {e.isReelection ? (
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: 'var(--muted-bg)', color: 'var(--accent)' }}
                title={t('reelectionTooltip')}
              >
                {t('reelectionBadge')}
              </span>
            ) : null}
            {e.earlyPromotionEligible ? (
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
                title={e.earlyPromotionEvidence}
              >
                {t('earlyPromotionBadge')}
              </span>
            ) : null}
            {!e.openSciencePassed ? (
              <span
                className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold"
                style={{ background: 'var(--warn-bg)', color: 'var(--warn)' }}
                title={e.openScienceEvidence}
              >
                {t('openScienceFailBadge')}
              </span>
            ) : null}
          </div>
          {/* Transparency notes (always visible, not hidden behind expand): the
              card can be green while Pogoj 1 failed (rulebook allows 2 of 3),
              and/or while leaning on self-entered, unverifiable EUR/years. A
              reviewer scanning the green header must see both caveats. */}
          {e.eligibleWithoutPogoj1 || e.reliesOnSelfReportedInputs ? (
            <div className="mt-2 space-y-1.5">
              {e.eligibleWithoutPogoj1 ? (
                <p
                  className="rounded-md border px-2 py-1 text-xs leading-snug"
                  style={{
                    background: 'var(--warn-bg)',
                    borderColor: 'var(--warn)',
                    color: 'var(--warn)',
                  }}
                >
                  {t('eligibleWithoutPogoj1Note')}
                </p>
              ) : null}
              {e.reliesOnSelfReportedInputs ? (
                <p className="text-[11px] italic leading-snug text-[var(--muted)]">
                  {t('selfReportedNote')}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          className="shrink-0 text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          {expanded ? t('hide') : t('show')}
        </button>
      </header>

      {expanded ? (
        <div className="border-t border-[var(--border)] px-4 sm:px-5 pb-5 pt-4">
          {e.blockingReasons.length > 0 ? (
            <div className="mb-4 rounded-md border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm">
              <strong className="font-semibold text-[var(--danger)]">
                {t('blockingReasonsTitle')}
              </strong>
              <ul className="ml-5 list-disc">
                {e.blockingReasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            {e.standards.map((s) => (
              <div
                key={s.name}
                className="rounded-md border border-[var(--border)] p-3 text-sm"
                style={{
                  background: s.passed ? 'var(--success-bg)' : 'var(--warn-bg)',
                  borderColor: s.passed ? 'var(--success)' : 'var(--warn)',
                }}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{s.name}</span>
                  <span>{s.passed ? '✓' : '✗'}</span>
                </div>
                <div className="text-xs text-[var(--muted)]">{s.description}</div>
                <p className="mt-2 text-xs leading-relaxed">{s.evidence}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3">
            <div className="text-xs text-[var(--muted)] tabnum">
              {t('contributionsSummary', {
                eq: fmt(e.totalEquivalents),
                count: e.contributions.length,
              })}
            </div>
            <button
              type="button"
              onClick={() => setContribOpen((s) => !s)}
              className="text-xs text-[var(--accent)] underline-offset-2 hover:underline"
            >
              {contribOpen ? t('hideContributions') : t('showContributions')}
            </button>
          </div>

          {contribOpen ? (
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-sm tabnum">
                <thead>
                  <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                    <th className="py-2 pr-4">{t('th.typology')}</th>
                    <th className="py-2 pr-4">{t('th.year')}</th>
                    <th className="py-2 pr-4">{t('th.title')}</th>
                    <th className="py-2 pr-4">{t('th.weight')}</th>
                    <th className="py-2 pr-4">{t('th.authorship')}</th>
                    <th className="py-2 pr-4 text-right">{t('th.equivalent')}</th>
                  </tr>
                </thead>
                <tbody>
                  {e.contributions.slice(0, 50).map((c) => (
                    <tr key={c.publication.id} className="border-b border-[var(--border)]/50">
                      <td className="py-2 pr-4 font-mono text-xs">{c.publication.typology}</td>
                      <td className="py-2 pr-4">{c.publication.year || '–'}</td>
                      <td className="py-2 pr-4">
                        <div className="line-clamp-2 max-w-md">{c.publication.title}</div>
                        {c.publication.parentTitle ? (
                          <div className="text-xs italic text-[var(--muted)]">
                            {c.publication.parentTitle}
                          </div>
                        ) : null}
                      </td>
                      <td className="py-2 pr-4" title={weightBucketLabel(c.weight)}>
                        {fmt(c.weight, 1)}
                      </td>
                      <td
                        className="py-2 pr-4"
                        title={authorshipLabel(c.publication.authorshipRole)}
                      >
                        {fmt(c.authorshipFactor, 1)}
                      </td>
                      <td className="py-2 pr-4 text-right font-medium">{fmt(c.equivalent)}</td>
                    </tr>
                  ))}
                </tbody>
                {e.contributions.length > 50 ? (
                  <tfoot>
                    <tr>
                      <td colSpan={6} className="py-2 text-xs text-[var(--muted)]">
                        {t('moreHidden', { count: e.contributions.length - 50 })}
                      </td>
                    </tr>
                  </tfoot>
                ) : null}
              </table>
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
