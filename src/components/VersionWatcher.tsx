'use client';

// Detects when a newer build has been deployed while the user's tab was open
// (or was restored from the back-forward cache) and offers a one-click refresh.
//
// Why this exists: NazivIER has no service worker, so a long-open tab keeps
// running the JS bundle it loaded originally. After a deploy the user can sit on
// a stale version indefinitely – which is exactly what bit Kaja ("cannot load
// the newest version"). This watcher polls the version-pinned /api/health,
// compares the live APP_VERSION against the one baked into the running bundle,
// and surfaces a discreet banner the moment they diverge.

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useRef, useState } from 'react';

import { APP_VERSION } from '@/lib/version';

const POLL_MS = 5 * 60 * 1000; // 5 min – cheap, /api/health is a tiny payload.

export function VersionWatcher() {
  const t = useTranslations('versionWatcher');
  const [latest, setLatest] = useState<string | null>(null);
  const dismissedFor = useRef<string | null>(null);

  const check = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (!res.ok) return;
      const data: { app?: { version?: string } } = await res.json();
      const live = data.app?.version;
      // Only surface a newer build; ignore equal/empty/unparseable values.
      if (live && live !== APP_VERSION) setLatest(live);
    } catch {
      /* offline or transient – try again on the next tick */
    }
  }, []);

  useEffect(() => {
    void check();
    const id = window.setInterval(check, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void check();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [check]);

  if (!latest || dismissedFor.current === latest) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-3 pb-3 print:hidden"
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-4 py-2.5 text-sm text-white shadow-lg">
        <span className="flex-1 leading-snug">
          {t('message', { version: latest })}
        </span>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="shrink-0 rounded-md bg-white px-3 py-1 font-semibold text-[var(--accent)] hover:bg-white/90"
        >
          {t('refresh')}
        </button>
        <button
          type="button"
          aria-label={t('dismiss')}
          onClick={() => {
            dismissedFor.current = latest;
            setLatest(null);
          }}
          className="shrink-0 rounded-md px-1.5 py-1 text-white/80 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
