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
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/roster')
      .then((r) => r.json())
      .then((d) => setRoster(d.researchers ?? []))
      .catch(() => setRoster([]));
  }, []);

  function submitManual() {
    const id = extractSicrisId(manualInput);
    if (!id) {
      setError(t('invalidInput'));
      return;
    }
    setError(null);
    onPick(id, t('sicrisIdLabel', { id }));
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
        <ul className="mt-4 grid gap-2 max-h-[26rem] overflow-y-auto pr-1">
          {roster.map((r) => (
            <li key={r.sicrisId}>
              <button
                disabled={loading}
                onClick={() => onPick(r.sicrisId, r.fullName)}
                className="w-full text-left rounded-md border border-transparent hover:border-[var(--border)] hover:bg-white dark:hover:bg-black/30 px-3 py-2 transition-colors disabled:opacity-50"
              >
                <div className="font-medium">{r.fullName}</div>
                <div className="text-xs text-[var(--muted)] tabnum">
                  {t('sicrisIdLabel', { id: r.sicrisId })}
                  {r.role ? ` · ${r.role}` : ''}
                </div>
              </button>
            </li>
          ))}
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
