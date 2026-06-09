'use client';

// Persistence + export toolbar (v2.9).
//
// Three groups of controls, all stateless beyond a transient toast:
//   1. »Natisni / shrani v PDF« — invokes window.print(). A print stylesheet
//      in globals.css hides nav/inputs/buttons and expands all collapsibles
//      so the printed page contains the full evaluation as a static report.
//   2. »Kopiraj povzetek« — builds a markdown report via buildMarkdownSummary()
//      and writes it to the clipboard. Paste-ready for email or a doc.
//   3. Persistence pills — »Shrani v e-pošto« opens a mailto: with the JSON
//      backup, »Naloži iz besedila« opens a modal where the user pastes a
//      previously exported JSON to restore inputs, and »Pobriši shranjene
//      podatke« clears localStorage for the current SICRIS ID.
//
// Auto-save indicator at the right edge confirms that the localStorage write
// has fired. The actual save is debounced and triggered from TitleCalculator
// when researcher state changes.

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

import { buildMarkdownSummary } from '@/lib/export/summary';
import {
  applyPersistedInputs,
  clearPersistedInputs,
  exportInputsAsJson,
  importInputsFromJson,
} from '@/lib/persistence/researcherStorage';
import type { TitleEvaluation } from '@/lib/scoring/evaluate';
import type { Researcher } from '@/lib/types';

interface Props {
  researcher: Researcher;
  evaluations: TitleEvaluation[];
  onResearcherChange: (next: Researcher) => void;
}

export function ExportToolbar({ researcher, evaluations, onResearcherChange }: Props) {
  const t = useTranslations('exportToolbar');
  const [toast, setToast] = useState<string | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreText, setRestoreText] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [savedLabel, setSavedLabel] = useState<string>('');

  // Refresh the auto-save timestamp whenever the researcher state changes.
  // Read it back from localStorage so the label reflects the actual write,
  // not the optimistic in-memory state.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(
          `nazivier:researcher:v1:${researcher.sicrisId}`,
        );
        if (!raw) {
          setSavedLabel('');
          return;
        }
        const parsed = JSON.parse(raw) as { savedAt?: string };
        if (parsed.savedAt) {
          setSavedLabel(new Date(parsed.savedAt).toLocaleTimeString('sl-SI'));
        }
      } catch {
        setSavedLabel('');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [researcher]);

  function flash(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function copySummary() {
    const md = buildMarkdownSummary(researcher, evaluations, new Date());
    try {
      await navigator.clipboard.writeText(md);
      flash(t('copiedToast'));
    } catch {
      // Fallback: drop into a hidden textarea, select, execCommand.
      const ta = document.createElement('textarea');
      ta.value = md;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        flash(t('copiedToast'));
      } catch {
        flash(t('copyFailed'));
      } finally {
        document.body.removeChild(ta);
      }
    }
  }

  function printReport() {
    // The print stylesheet handles layout. Defer to the next tick so the
    // toast paints before the system print dialog opens.
    flash(t('printingToast'));
    window.setTimeout(() => window.print(), 100);
  }

  function emailBackup() {
    const json = exportInputsAsJson(researcher);
    const subject = `NazivIER shramba — ${researcher.fullName} (${researcher.sicrisId})`;
    const intro = t('emailIntro', { name: researcher.fullName });
    // Wrap JSON in a fenced code block so it's recognisable and easy to copy
    // back into the »Naloži iz besedila« modal later.
    const body = `${intro}\n\n\`\`\`json\n${json}\n\`\`\`\n`;
    const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    flash(t('emailToast'));
  }

  function handleRestore() {
    setRestoreError(null);
    const parsed = importInputsFromJson(restoreText);
    if (!parsed) {
      setRestoreError(t('restoreInvalid'));
      return;
    }
    if (parsed.sicrisId !== researcher.sicrisId) {
      setRestoreError(
        t('restoreMismatch', {
          have: parsed.sicrisId,
          want: researcher.sicrisId,
        }),
      );
      return;
    }
    onResearcherChange(applyPersistedInputs(researcher, parsed));
    setRestoreOpen(false);
    setRestoreText('');
    flash(t('restoreToast'));
  }

  function resetSaved() {
    if (!window.confirm(t('resetConfirm'))) return;
    clearPersistedInputs(researcher.sicrisId);
    setSavedLabel('');
    flash(t('resetToast'));
  }

  return (
    <section
      className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-3 text-xs print:hidden"
      aria-label={t('ariaLabel')}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={printReport}
          className="rounded-md bg-[var(--accent)] px-3 py-1.5 font-semibold text-white hover:opacity-90"
        >
          🖨 {t('printPdf')}
        </button>
        <button
          type="button"
          onClick={copySummary}
          className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 hover:border-[var(--accent)] dark:bg-black"
        >
          📋 {t('copySummary')}
        </button>
        <button
          type="button"
          onClick={emailBackup}
          className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 hover:border-[var(--accent)] dark:bg-black"
          title={t('emailHint')}
        >
          ✉ {t('emailBackup')}
        </button>
        <button
          type="button"
          onClick={() => {
            setRestoreOpen(true);
            setRestoreText('');
            setRestoreError(null);
          }}
          className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 hover:border-[var(--accent)] dark:bg-black"
          title={t('restoreHint')}
        >
          📂 {t('restoreFromText')}
        </button>
        <button
          type="button"
          onClick={resetSaved}
          className="rounded-md border border-[var(--border)] bg-white px-3 py-1.5 text-[var(--muted)] hover:border-[var(--danger)] hover:text-[var(--danger)] dark:bg-black"
          title={t('resetHint')}
        >
          🗑 {t('resetSaved')}
        </button>
        <span className="ml-auto flex items-center gap-2 text-[var(--muted)]">
          {savedLabel ? (
            <span title={t('autosaveTooltip')}>
              {t('autosaveAt', { time: savedLabel })}
            </span>
          ) : (
            <span className="italic">{t('autosaveNone')}</span>
          )}
          {toast ? (
            <span className="rounded-md bg-[var(--accent)] px-2 py-0.5 text-white">{toast}</span>
          ) : null}
        </span>
      </div>
      <p className="mt-2 text-[10px] leading-snug text-[var(--muted)]">
        {t('explainer')}
      </p>

      {restoreOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="restore-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setRestoreOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-lg border border-[var(--border)] bg-white p-5 shadow-xl dark:bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="restore-modal-title" className="text-base font-semibold">
              {t('restoreTitle')}
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">{t('restoreIntro')}</p>
            <textarea
              autoFocus
              value={restoreText}
              onChange={(e) => setRestoreText(e.target.value)}
              placeholder={t('restorePlaceholder')}
              className="mt-3 h-48 w-full rounded-md border border-[var(--border)] bg-transparent p-2 font-mono text-xs focus:border-[var(--accent)] focus:outline-none"
            />
            {restoreError ? (
              <p className="mt-2 text-xs text-[var(--danger)]">{restoreError}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setRestoreOpen(false);
                  setRestoreText('');
                  setRestoreError(null);
                }}
                className="rounded-md px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {t('restoreCancel')}
              </button>
              <button
                type="button"
                onClick={handleRestore}
                disabled={restoreText.trim().length === 0}
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {t('restoreConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
