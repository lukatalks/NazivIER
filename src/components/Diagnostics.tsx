'use client';

// Small diagnostic helpers surfaced to the user:
//   - <VersionFooter />          shown at the bottom of every page
//   - <DiagnosticsOnError />     shown above the error banner so bug reports
//                                include the full context needed to debug
//
// Goal: every error a researcher sees should ship with enough metadata that
// the developer can reproduce it without having to ask follow-up questions.

import { useTranslations } from 'next-intl';
import { useState } from 'react';

import {
  APP_VERSION,
  ALGO_VERSION,
  COMMIT_REF,
  COMMIT_SHA,
  ENV,
  buildDateISO,
} from '@/lib/version';

export function VersionFooter() {
  const t = useTranslations('diagnostics');
  const built = buildDateISO();
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--muted)]/70">
      <span title={t('versionTooltip')}>v{APP_VERSION}</span>
      {built ? (
        <>
          <span aria-hidden>·</span>
          {/* Always-fresh deploy date. The rulebook/algorithm stamp lives in the
              tooltip + the diagnostics block, so the visible date can never drift
              out of sync with the version again. */}
          <span title={t('buildTooltip', { algo: ALGO_VERSION })}>{built}</span>
        </>
      ) : null}
      {ENV !== 'production' ? (
        <>
          <span aria-hidden>·</span>
          <span>{ENV}</span>
        </>
      ) : null}
    </span>
  );
}

interface DiagnosticsProps {
  /** The error message (string) or any object that can serialise to JSON. */
  error: string | Record<string, unknown>;
  /** SICRIS ID requested (when relevant). */
  sicrisId?: string | null;
  /** Free-form extra context the caller wants to expose. */
  extra?: Record<string, unknown>;
}

/** Renders a copy-to-clipboard block with full diagnostic info. */
export function DiagnosticsBlock({ error, sicrisId, extra }: DiagnosticsProps) {
  const t = useTranslations('diagnostics');
  const [copied, setCopied] = useState(false);

  const payload = {
    app: {
      version: APP_VERSION,
      algorithm: ALGO_VERSION,
      env: ENV,
      ref: COMMIT_REF,
      sha: COMMIT_SHA,
    },
    sicrisId: sicrisId ?? null,
    when: new Date().toISOString(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    error: typeof error === 'string' ? error : error,
    ...(extra ?? {}),
  };
  const json = JSON.stringify(payload, null, 2);

  async function copy() {
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <details className="mt-2 rounded-md border border-[var(--border)] bg-[var(--muted-bg)] text-xs">
      <summary className="cursor-pointer select-none px-3 py-2 font-semibold text-[var(--muted)]">
        {t('detailsSummary')}
      </summary>
      <div className="border-t border-[var(--border)] p-3 space-y-2">
        <p className="text-[var(--muted)]">{t('detailsHelp')}</p>
        <pre className="overflow-x-auto rounded bg-black/5 dark:bg-white/5 p-2 text-[11px] leading-relaxed">
{json}
        </pre>
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-[var(--border)] px-2 py-1 text-xs hover:bg-white dark:hover:bg-black/30"
        >
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
    </details>
  );
}
