// Centralised version constants surfaced in the footer and bug-report panel.
//
// Bump APP_VERSION on every release (semver). Bump ALGO_VERSION whenever the
// scoring engine changes outcomes (weights, criteria, Pogoj logic). Keeping
// them separate lets reviewers distinguish UI/tooling changes from changes
// that affect researcher pass/fail.

export const APP_VERSION = '3.2.4';
export const ALGO_VERSION = '2026-06-09-v2.2-final';
/** Build timestamp, injected automatically at build time (next.config `env`).
 *  Always fresh on every deploy – the footer date can never go stale again,
 *  because nobody has to remember to bump it by hand. */
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? '';
export const COMMIT_SHA =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ??
  process.env.VERCEL_GIT_COMMIT_SHA ??
  'local';
export const COMMIT_REF =
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_REF ??
  process.env.VERCEL_GIT_COMMIT_REF ??
  'main';
export const ENV =
  process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.VERCEL_ENV ?? 'local';

/** Build date as YYYY-MM-DD for the footer; '' when the timestamp is unknown
 *  (e.g. a local build before next.config injects it). */
export function buildDateISO(): string {
  if (!BUILD_TIME) return '';
  const iso = BUILD_TIME.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : '';
}

/** Short tag shown next to the footer copy: "v3.0.5 · 2026-06-12". */
export function versionShort(): string {
  const d = buildDateISO();
  return d ? `v${APP_VERSION} · ${d}` : `v${APP_VERSION}`;
}

/** Full diagnostic line for the bug-report panel. */
export function versionLong(): string {
  return `v${APP_VERSION} · alg ${ALGO_VERSION} · ${ENV} · ${COMMIT_REF}@${COMMIT_SHA.slice(0, 7)}`;
}
