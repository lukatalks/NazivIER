// Centralised version constants surfaced in the footer and bug-report panel.
//
// Bump APP_VERSION on every release (semver). Bump ALGO_VERSION whenever the
// scoring engine changes outcomes (weights, criteria, Pogoj logic). Keeping
// them separate lets reviewers distinguish UI/tooling changes from changes
// that affect researcher pass/fail.

export const APP_VERSION = '2.6.5';
export const ALGO_VERSION = '2026-05-26-draft';
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

/** Short tag shown next to the footer copy: "v2.6.0 · alg 2026-05-26-draft". */
export function versionShort(): string {
  return `v${APP_VERSION} · alg ${ALGO_VERSION}`;
}

/** Full diagnostic line for the bug-report panel. */
export function versionLong(): string {
  return `v${APP_VERSION} · alg ${ALGO_VERSION} · ${ENV} · ${COMMIT_REF}@${COMMIT_SHA.slice(0, 7)}`;
}
