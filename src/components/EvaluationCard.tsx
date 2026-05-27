'use client';

import { useState } from 'react';

import { authorshipLabel } from '@/lib/scoring/authorship';
import type { TitleEvaluation } from '@/lib/scoring/evaluate';
import { weightBucketLabel } from '@/lib/scoring/weights';

interface Props {
  evaluation: TitleEvaluation;
  defaultExpanded?: boolean;
}

function fmt(n: number, decimals = 2): string {
  return n.toLocaleString('sl-SI', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function EvaluationCard({ evaluation: e, defaultExpanded = false }: Props) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <article
      className="rounded-lg border bg-white dark:bg-black/20"
      style={{
        borderColor: e.eligible ? 'var(--success)' : 'var(--border)',
      }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold tabnum"
              style={{
                background: e.eligible ? 'var(--success-bg)' : 'var(--muted-bg)',
                color: e.eligible ? 'var(--success)' : 'var(--muted)',
              }}
            >
              {e.eligible ? '✓ Izvolljiv' : '✗ Ni izvolljiv'}
            </span>
            <span className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Karierna stopnja {e.stage}.
            </span>
          </div>
          <h3 className="mt-1 text-lg font-semibold">{e.groupLabel}</h3>
          <p className="text-sm text-[var(--muted)]">
            Pogoji standardov: {e.standardsMet} / {e.standardsRequired} izpolnjenih · skupaj
            ekvivalentov: <span className="tabnum">{fmt(e.totalEquivalents)}</span> · čisti citati
            ({e.citationSource === 'none' ? 'ni podatka' : e.citationSource}):{' '}
            <span className="tabnum">{e.citationsUsed}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setExpanded((s) => !s)}
          className="text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          {expanded ? 'Skrij obrazložitev' : 'Prikaži obrazložitev'}
        </button>
      </header>

      {expanded ? (
        <div className="border-t border-[var(--border)] px-5 pb-5 pt-4">
          {e.blockingReasons.length > 0 ? (
            <div className="mb-4 rounded-md border border-[var(--danger)] bg-[var(--danger-bg)] px-3 py-2 text-sm">
              <strong className="font-semibold text-[var(--danger)]">Razlogi neizvolljivosti:</strong>
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

          <h4 className="mt-5 text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Prispevek posameznih publikacij k ekvivalentom
          </h4>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-sm tabnum">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-xs text-[var(--muted)]">
                  <th className="py-2 pr-4">Tip.</th>
                  <th className="py-2 pr-4">Leto</th>
                  <th className="py-2 pr-4">Naslov</th>
                  <th className="py-2 pr-4">Utež</th>
                  <th className="py-2 pr-4">Avtor.</th>
                  <th className="py-2 pr-4 text-right">Ekv.</th>
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
                      … in še {e.contributions.length - 50} publikacij (skrito zaradi dolžine).
                    </td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>
        </div>
      ) : null}
    </article>
  );
}
