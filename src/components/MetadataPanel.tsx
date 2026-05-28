'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import type { EducationLevel, Researcher } from '@/lib/types';

interface Props {
  researcher: Researcher;
  onChange(patch: Partial<Researcher>): void;
}

export function MetadataPanel({ researcher: r, onChange }: Props) {
  const t = useTranslations('metadata');
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-4 sm:p-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t('title')}
          </h2>
          <p className="text-xs text-[var(--muted)]">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="shrink-0 text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          {open ? t('close') : t('open')}
        </button>
      </header>

      {open ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">{t('fields.educationLevel')}</span>
            <select
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
              value={r.educationLevel ?? ''}
              onChange={(e) =>
                onChange({
                  educationLevel: (Number(e.target.value) || undefined) as
                    | EducationLevel
                    | undefined,
                })
              }
            >
              <option value="">{t('fields.educationOptions.none')}</option>
              <option value="8">{t('fields.educationOptions.8')}</option>
              <option value="9">{t('fields.educationOptions.9')}</option>
              <option value="10">{t('fields.educationOptions.10')}</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">{t('fields.yearsInResearchSector')}</span>
            <input
              type="number"
              min={0}
              max={60}
              value={r.yearsInResearchSector ?? ''}
              onChange={(e) =>
                onChange({ yearsInResearchSector: Number(e.target.value) || undefined })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">{t('fields.externalProjectsFte')}</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={r.externalProjectsFte ?? ''}
              onChange={(e) =>
                onChange({ externalProjectsFte: Number(e.target.value) || undefined })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">{t('fields.leadershipFte')}</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={r.leadership?.cumulativeFte ?? ''}
              onChange={(e) =>
                onChange({
                  leadership: {
                    ...r.leadership,
                    cumulativeFte: Number(e.target.value) || 0,
                    leadershipYears: r.leadership?.leadershipYears ?? 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">{t('fields.leadershipYears')}</span>
            <input
              type="number"
              min={0}
              max={60}
              value={r.leadership?.leadershipYears ?? ''}
              onChange={(e) =>
                onChange({
                  leadership: {
                    cumulativeFte: r.leadership?.cumulativeFte ?? 0,
                    leadershipYears: Number(e.target.value) || 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">{t('fields.weight10Count')}</span>
            <input
              type="number"
              min={0}
              max={500}
              value={r.extraAchievements?.weight10Count ?? ''}
              onChange={(e) =>
                onChange({
                  extraAchievements: {
                    weight10Count: Number(e.target.value) || 0,
                    weight05Count: r.extraAchievements?.weight05Count ?? 0,
                    weight03Count: r.extraAchievements?.weight03Count ?? 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">{t('fields.weight05Count')}</span>
            <input
              type="number"
              min={0}
              max={500}
              value={r.extraAchievements?.weight05Count ?? ''}
              onChange={(e) =>
                onChange({
                  extraAchievements: {
                    weight10Count: r.extraAchievements?.weight10Count ?? 0,
                    weight05Count: Number(e.target.value) || 0,
                    weight03Count: r.extraAchievements?.weight03Count ?? 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">{t('fields.weight03Count')}</span>
            <input
              type="number"
              min={0}
              max={500}
              value={r.extraAchievements?.weight03Count ?? ''}
              onChange={(e) =>
                onChange({
                  extraAchievements: {
                    weight10Count: r.extraAchievements?.weight10Count ?? 0,
                    weight05Count: r.extraAchievements?.weight05Count ?? 0,
                    weight03Count: Number(e.target.value) || 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col sm:col-span-2 lg:col-span-4 mt-2 border-t border-[var(--border)] pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              {t('fields.reelectionLabel')}
            </span>
            <span className="mt-1 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!r.isReelection}
                onChange={(e) => onChange({ isReelection: e.target.checked })}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              {t('fields.reelectionHelp')}
            </span>
          </label>

          {/* "What if" simulation toggles. These never change input data – they
              just tell the evaluator to bypass two common blockers so the user
              can see which title the candidate would qualify for in a clean
              scenario. */}
          <fieldset className="sm:col-span-2 lg:col-span-4 mt-2 border-t border-[var(--border)] pt-3">
            <legend className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              {t('fields.simulationLabel')}
            </legend>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {t('fields.simulationHelp')}
            </p>
            <div className="mt-2 flex flex-col gap-2 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!r.simulateMaxEducation}
                  onChange={(e) =>
                    onChange({ simulateMaxEducation: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                {t('fields.simulateMaxEducation')}
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!r.simulateOpenScience}
                  onChange={(e) =>
                    onChange({ simulateOpenScience: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-[var(--border)]"
                />
                {t('fields.simulateOpenScience')}
              </label>
            </div>
          </fieldset>
        </div>
      ) : null}
    </section>
  );
}
