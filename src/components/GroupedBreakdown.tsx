'use client';

// Two-level breakdown UX (per supervisor 2026-05-28):
//   Top level shows three group cards (Znanstveni / Strokovno-raziskovalni /
//   Razvojni) summarising the highest eligible title and standards met.
//   Clicking a group expands to the per-title evaluation cards inside.
//
// Why this matters: the rulebook organises titles into three vertical
// families. Researchers usually care about ONE family — showing all 18 titles
// flat creates a wall of cards. Group-first lets the user drill into the
// family that matters to them.

import { useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';

import { EvaluationCard } from '@/components/EvaluationCard';
import type { TitleEvaluation } from '@/lib/scoring/evaluate';
import type { TitleGroup } from '@/lib/types';

type GroupKey = TitleGroup;
const GROUPS: GroupKey[] = ['znanstveni', 'strokovno-raziskovalni', 'razvojni'];

interface Props {
  evaluations: TitleEvaluation[];
}

export function GroupedBreakdown({ evaluations }: Props) {
  const t = useTranslations();
  const locale = useLocale();
  const numLocale = locale === 'sl' ? 'sl-SI' : 'en-GB';
  const [openGroup, setOpenGroup] = useState<GroupKey | null>(null);

  const byGroup = groupEvaluations(evaluations);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{t('breakdownTitle')}</h2>
      <div className="grid gap-3 sm:grid-cols-3">
        {GROUPS.map((g) => {
          const list = byGroup[g];
          const eligible = list.find((e) => e.eligible);
          const open = openGroup === g;
          return (
            <button
              key={g}
              type="button"
              onClick={() => setOpenGroup(open ? null : g)}
              aria-expanded={open}
              className="rounded-lg border border-[var(--border)] bg-white dark:bg-black/20 p-4 text-left transition hover:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              style={{
                borderColor: eligible
                  ? open
                    ? 'var(--accent)'
                    : 'var(--success)'
                  : open
                    ? 'var(--accent)'
                    : 'var(--border)',
              }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {t(`summary.groups.${g}` as 'summary.groups.znanstveni')}
              </div>
              <div className="mt-1 text-base font-semibold">
                {eligible ? eligible.groupLabel : t('summary.notEligible')}
              </div>
              <div className="mt-1 text-xs text-[var(--muted)] tabnum">
                {eligible
                  ? t('summary.stageStandards', {
                      stage: eligible.stage,
                      met: eligible.standardsMet,
                      required: eligible.standardsRequired,
                      eq: eligible.totalEquivalents.toLocaleString(numLocale, {
                        maximumFractionDigits: 2,
                      }),
                    })
                  : t('breakdownGroups.openHint', { count: list.length })}
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--accent)]">
                <span>
                  {open
                    ? t('breakdownGroups.hideTitles')
                    : t('breakdownGroups.showTitles', { count: list.length })}
                </span>
                <span aria-hidden>{open ? '▴' : '▾'}</span>
              </div>
            </button>
          );
        })}
      </div>

      {openGroup ? (
        <div className="mt-5">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t(`summary.groups.${openGroup}` as 'summary.groups.znanstveni')} —{' '}
            {t('breakdownGroups.allTitles')}
          </div>
          <div className="grid gap-4">
            {byGroup[openGroup].map((e) => (
              <EvaluationCard key={e.title} evaluation={e} defaultExpanded={e.eligible} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

// Title → group mapping. Mirrors GROUP_ORDER in evaluate.ts.
const GROUP_OF: Record<string, GroupKey> = {
  'asistent': 'znanstveni',
  'asistent-mag': 'znanstveni',
  'asistent-dr': 'znanstveni',
  'znanstveni-sodelavec': 'znanstveni',
  'visji-znanstveni-sodelavec': 'znanstveni',
  'znanstveni-svetnik': 'znanstveni',

  'asistent-srr': 'strokovno-raziskovalni',
  'visji-asistent-srr': 'strokovno-raziskovalni',
  'visji-strokovno-raziskovalni-asistent': 'strokovno-raziskovalni',
  'strokovno-raziskovalni-sodelavec': 'strokovno-raziskovalni',
  'visji-strokovno-raziskovalni-sodelavec': 'strokovno-raziskovalni',
  'strokovno-raziskovalni-svetnik': 'strokovno-raziskovalni',

  'razvijalec': 'razvojni',
  'visji-razvijalec': 'razvojni',
  'samostojni-razvijalec': 'razvojni',
  'razvojni-sodelavec': 'razvojni',
  'visji-razvojni-sodelavec': 'razvojni',
  'razvojni-svetnik': 'razvojni',
};

// Stage order within each group (lowest → highest).
const STAGE_ORDER = ['I', 'II', 'II-sodelavec', 'III', 'IV'];

function groupEvaluations(
  evaluations: TitleEvaluation[],
): Record<GroupKey, TitleEvaluation[]> {
  const out: Record<GroupKey, TitleEvaluation[]> = {
    znanstveni: [],
    'strokovno-raziskovalni': [],
    razvojni: [],
  };
  for (const e of evaluations) {
    const g = GROUP_OF[e.title];
    if (g) out[g].push(e);
  }
  // Sort each group highest-stage first (svetnik before sodelavec before asistent).
  for (const g of GROUPS) {
    out[g].sort(
      (a, b) =>
        STAGE_ORDER.indexOf(b.stage as string) -
        STAGE_ORDER.indexOf(a.stage as string),
    );
  }
  return out;
}
