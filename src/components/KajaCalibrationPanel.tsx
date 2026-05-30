'use client';

// Kaja calibration panel — password-gated alternative-Σ view.
//
// Why it's password-gated rather than open: this is a reviewer dialogue tool,
// not a candidate-facing feature. The lock keeps casual users from misreading
// the strict Σ as "the real score". The password (»KAJAZMAJA«) is friction
// not security – the value of the gate is the deliberate intent to interpret
// the alternative figure as a calibration exercise.
//
// What it does NOT do: it never changes the rulebook pass/fail. The official
// evaluator (`evaluate.ts`) is the only source of eligibility truth. This panel
// strictly shows an additional figure side-by-side with the rulebook Σ.
//
// Two exports: <KajaUnlockButton /> for inline mounting next to the researcher
// name, and <KajaCalibrationPanel /> for the full panel rendered below the
// summary. Both share state via sessionStorage + a window-level custom event so
// either one can flip the lock without prop drilling through SummaryStrip.

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import { computeKajaCalibration } from '@/lib/scoring/kajaCalibration';
import type { Researcher } from '@/lib/types';

const PASSWORD = 'KAJAZMAJA';
const STORAGE_KEY = 'nazivier:kaja-mode-unlocked';
const UNLOCK_EVENT = 'nazivier:kaja-unlock-changed';

function readUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(STORAGE_KEY) === '1';
}

function broadcastUnlock(unlocked: boolean) {
  if (typeof window === 'undefined') return;
  if (unlocked) window.sessionStorage.setItem(STORAGE_KEY, '1');
  else window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(UNLOCK_EVENT, { detail: { unlocked } }));
}

function useKajaUnlock(): [boolean, (next: boolean) => void] {
  const [unlocked, setUnlockedState] = useState(false);
  useEffect(() => {
    setUnlockedState(readUnlocked());
    function onChange(e: Event) {
      const detail = (e as CustomEvent<{ unlocked: boolean }>).detail;
      setUnlockedState(!!detail?.unlocked);
    }
    window.addEventListener(UNLOCK_EVENT, onChange);
    return () => window.removeEventListener(UNLOCK_EVENT, onChange);
  }, []);
  return [unlocked, (next: boolean) => broadcastUnlock(next)];
}

/** Lock/unlock chip rendered inline next to the researcher name. */
export function KajaUnlockButton() {
  const t = useTranslations('kajaCalibration');
  const [unlocked, setUnlocked] = useKajaUnlock();
  const [showModal, setShowModal] = useState(false);
  const [entered, setEntered] = useState('');
  const [wrongTries, setWrongTries] = useState(0);

  function tryUnlock() {
    if (entered.trim().toUpperCase() === PASSWORD) {
      setUnlocked(true);
      setShowModal(false);
      setEntered('');
      setWrongTries(0);
    } else {
      setWrongTries((n) => n + 1);
    }
  }

  if (unlocked) {
    return (
      <button
        type="button"
        onClick={() => setUnlocked(false)}
        aria-label={t('relockButtonAria')}
        title={t('relockTooltip')}
        className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--accent)] text-[var(--accent)] transition hover:opacity-80"
      >
        <span aria-hidden className="text-sm">🔓</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        aria-label={t('lockButtonAria')}
        title={t('lockTooltip')}
        className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <span aria-hidden className="text-sm">🔒</span>
      </button>
      {showModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kaja-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-white p-5 shadow-xl dark:bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="kaja-modal-title" className="text-base font-semibold">
              {t('modalTitle')}
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">{t('modalIntro')}</p>
            <input
              type="password"
              autoFocus
              value={entered}
              onChange={(e) => setEntered(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') tryUnlock();
              }}
              placeholder={t('passwordPlaceholder')}
              className="mt-3 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
            {wrongTries > 0 ? (
              <p className="mt-2 text-xs text-[var(--danger)]">{t('wrongPassword')}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEntered('');
                  setWrongTries(0);
                }}
                className="rounded-md px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={tryUnlock}
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                {t('unlock')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

interface PanelProps {
  researcher: Researcher;
  /** Rulebook Σ from the official evaluator, for side-by-side display. */
  rulebookTotal: number;
}

/** Full calibration panel rendered only when unlocked. */
export function KajaCalibrationPanel({ researcher, rulebookTotal }: PanelProps) {
  const t = useTranslations('kajaCalibration');
  const [unlocked] = useKajaUnlock();
  const calibration = useMemo(() => computeKajaCalibration(researcher), [researcher]);
  const deltaPct = rulebookTotal > 0
    ? Math.round(((calibration.total - rulebookTotal) / rulebookTotal) * 100)
    : 0;

  if (!unlocked) return null;

  return (
    <section className="rounded-lg border border-[var(--accent)] bg-[var(--muted-bg)] p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
          {t('panelTitle')}
        </h3>
        <span className="text-xs text-[var(--muted)]">{t('notForPassFail')}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t('spec')}</p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Cell
          label={t('rulebookTotal')}
          value={rulebookTotal.toLocaleString('sl-SI', { maximumFractionDigits: 2 })}
          hint={t('rulebookHint')}
        />
        <Cell
          label={t('strictTotal')}
          value={calibration.total.toLocaleString('sl-SI', { maximumFractionDigits: 2 })}
          hint={t('strictHint')}
          emphasis
        />
        <Cell
          label={t('delta')}
          value={`${deltaPct > 0 ? '+' : ''}${deltaPct} %`}
          hint={
            calibration.total >= rulebookTotal
              ? t('deltaAbove')
              : t('deltaBelow')
          }
          tone={calibration.total >= rulebookTotal ? 'success' : 'warn'}
        />
      </div>

      <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <Row k={t('firstCorrCount')} v={calibration.firstOrCorrespondingCount} />
        <Row k={t('skippedCount')} v={calibration.skippedCount} />
        <Row k={t('awardCount')} v={calibration.awardCount} />
        <Row
          k={t('pubContribution')}
          v={calibration.publicationContribution.toLocaleString('sl-SI', { maximumFractionDigits: 2 })}
        />
      </dl>

      <details className="mt-4 text-xs">
        <summary className="cursor-pointer font-semibold text-[var(--muted)]">
          {t('limitsSummary')}
        </summary>
        <ul className="mt-2 ml-5 list-disc space-y-1 text-[var(--muted)]">
          <li>{t('limit_authorship')}</li>
          <li>{t('limit_senior')}</li>
          <li>{t('limit_corresponding')}</li>
          <li>{t('limit_awards')}</li>
          <li>{t('limit_q12')}</li>
        </ul>
      </details>
    </section>
  );
}

function Cell({
  label,
  value,
  hint,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
  tone?: 'success' | 'warn';
}) {
  const color =
    tone === 'success'
      ? 'text-[var(--success)]'
      : tone === 'warn'
        ? 'text-[var(--warn)]'
        : emphasis
          ? 'text-[var(--accent)]'
          : 'text-[var(--foreground)]';
  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-3 dark:bg-black/20">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabnum ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[var(--border)] py-1">
      <dt className="text-[var(--muted)]">{k}</dt>
      <dd className="tabnum font-semibold">{v}</dd>
    </div>
  );
}
