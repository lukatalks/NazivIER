'use client';

import { useState } from 'react';

import type { EducationLevel, Researcher } from '@/lib/types';

interface Props {
  researcher: Researcher;
  onChange(patch: Partial<Researcher>): void;
}

export function MetadataPanel({ researcher: r, onChange }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-5">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Podatki, ki jih SICRIS ne razkrije
          </h2>
          <p className="text-xs text-[var(--muted)]">
            Po pravilniku obvezni za izračun, vendar v SICRIS-u niso vedno dostopni — vnesite ali
            potrdite ročno.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          {open ? 'Zapri' : 'Uredi'}
        </button>
      </header>

      {open ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">Čisti citati po WoS</span>
            <input
              type="number"
              min={0}
              value={r.citations?.wosCleanCitations ?? 0}
              onChange={(e) =>
                onChange({
                  citations: {
                    ...r.citations,
                    wosCleanCitations: Number(e.target.value) || 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1 tabnum"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">Čisti citati po Scopus</span>
            <input
              type="number"
              min={0}
              value={r.citations?.scopusCleanCitations ?? ''}
              onChange={(e) =>
                onChange({
                  citations: {
                    wosCleanCitations: r.citations?.wosCleanCitations ?? 0,
                    scopusCleanCitations: Number(e.target.value) || undefined,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1 tabnum"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">Raven izobrazbe (SOK)</span>
            <select
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
              value={r.educationLevel ?? ''}
              onChange={(e) =>
                onChange({
                  educationLevel: (Number(e.target.value) || undefined) as EducationLevel | undefined,
                })
              }
            >
              <option value="">–</option>
              <option value="8">8. raven (mag. stroke)</option>
              <option value="9">9. raven (mag. znanosti)</option>
              <option value="10">10. raven (doktorat)</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">Let v raziskovalnem sektorju</span>
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
            <span className="text-xs text-[var(--muted)]">Vrednost projektov izven ARIS (FTE)</span>
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
            <span className="text-xs text-[var(--muted)]">
              Kum. vrednost vodenih projektov (FTE A)
            </span>
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
            <span className="text-xs text-[var(--muted)]">Let v vodilni funkciji</span>
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
        </div>
      ) : null}
    </section>
  );
}
