'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { extractSicrisId } from '@/lib/sicris/url';
import type { RosterEntry } from '@/lib/sicris/roster';

interface Props {
  onPick(sicrisId: string, label: string): void;
  loading: boolean;
}

export function ResearcherPicker({ onPick, loading }: Props) {
  const t = useTranslations('picker');
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [rosterState, setRosterState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setRosterState('loading');
    fetch('/api/roster')
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        setRoster(d.researchers ?? []);
        setRosterState('ready');
      })
      .catch((e) => {
        setRosterState('error');
        setRosterError(e instanceof Error ? e.message : String(e));
        setRoster([]);
      });
  }, []);

  function pick(sicrisId: string, label: string) {
    setSelectedId(sicrisId);
    setError(null);
    onPick(sicrisId, label);
  }

  function submitManual() {
    const id = extractSicrisId(manualInput);
    if (!id) {
      setError(t('invalidInput'));
      return;
    }
    pick(id, t('sicrisIdLabel', { id }));
  }

  return (
    <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
      <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t('selectFromList')}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {t('selectFromListHint1')}
          <a
            href="https://www.ier.si/zaposleni"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            ier.si/zaposleni
          </a>
          {t('selectFromListHint2')}
          {t('selectFromListHintCount', { count: roster.length })}
          {t('selectFromListHint3')}
        </p>

        {rosterState === 'loading' ? (
          <p className="mt-3 text-xs text-[var(--muted)]">{t('rosterLoading')}</p>
        ) : null}
        {rosterState === 'error' ? (
          <p className="mt-3 text-xs text-[var(--danger)]">
            {t('rosterError', { msg: rosterError ?? '' })}
          </p>
        ) : null}

        {/* Per-button disabled state removed on purpose. A colleague reported
            the picker "doesn't work" because while one researcher was loading
            every other button became unclickable. We now keep buttons live;
            the selected one is visually marked and clicks update selection
            even mid-load (the parent's setLoading guards the actual fetch). */}
        {/* Cap + inner scroll only on ≥sm. On mobile a nested scroll box
            fights the page scroll (janky name rendering + odd top gap reported
            2026-06-12), so let the roster flow with the page there. */}
        <ul className="mt-4 grid gap-2 sm:max-h-[26rem] sm:overflow-y-auto pr-1">
          {roster.map((r) => {
            const isSelected = selectedId === r.sicrisId;
            const isLoadingThis = isSelected && loading;
            return (
              <li key={r.sicrisId}>
                <button
                  type="button"
                  onClick={() => pick(r.sicrisId, r.fullName)}
                  aria-pressed={isSelected}
                  className="w-full text-left rounded-md border px-3 py-2 transition-colors hover:bg-white dark:hover:bg-black/30 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                  style={{
                    borderColor: isSelected ? 'var(--accent)' : 'transparent',
                    background: isSelected
                      ? 'rgba(169, 40, 37, 0.06)'
                      : 'transparent',
                    touchAction: 'manipulation',
                  }}
                >
                  <div className="font-medium flex items-center gap-2">
                    <span>{r.fullName}</span>
                    {isLoadingThis ? (
                      <span className="text-xs text-[var(--accent)] tabnum">
                        {t('loadingInline')}
                      </span>
                    ) : null}
                  </div>
                  <div className="text-xs text-[var(--muted)] tabnum">
                    {t('sicrisIdLabel', { id: r.sicrisId })}
                    {r.role ? ` · ${r.role}` : ''}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-4 sm:p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t('pasteUrl')}
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          {t('pasteUrlHint1')}
          <span className="font-mono text-xs">{t('pasteUrlHintCode')}</span>
          {t('pasteUrlHint2')}
        </p>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={manualInput}
            onChange={(e) => setManualInput(e.target.value)}
            placeholder="33182  ·  https://cris.cobiss.net/ecris/si/sl/researcher/33182"
            disabled={loading}
            className="flex-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-3 py-2 text-sm disabled:opacity-50"
            onKeyDown={(e) => {
              if (e.key === 'Enter') submitManual();
            }}
          />
          <button
            type="button"
            onClick={submitManual}
            disabled={loading}
            className="rounded-md bg-[var(--primary)] text-[var(--primary-foreground)] px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {t('calculate')}
          </button>
        </div>
        {error ? <p className="mt-2 text-sm text-[var(--danger)]">{error}</p> : null}
      </div>
    </div>
  );
}
