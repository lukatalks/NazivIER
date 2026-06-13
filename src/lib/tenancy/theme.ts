// Generates a per-tenant CSS-variable override block, injected into <head> by the
// locale layout. It overrides only the brand-specific custom properties defined
// in globals.css (primary / accent / accent-soft / muted-bg) for both light and
// dark schemes; all other tokens fall back to the globals.css defaults.
//
// For the IER tenant the emitted values equal the globals.css defaults, so this
// is a no-op visually — the mechanism is what matters: a new tenant themes the
// whole app from its colour set alone.

import type { TenantColorSet, TenantConfig } from '@/lib/tenancy/types';

function vars(c: TenantColorSet): string {
  return [
    `--primary:${c.primary}`,
    `--primary-foreground:${c.primaryForeground}`,
    `--accent:${c.accent}`,
    `--accent-soft:${c.accentSoft}`,
    c.mutedBg ? `--muted-bg:${c.mutedBg}` : '',
  ]
    .filter(Boolean)
    .join(';');
}

export function tenantThemeCss(tenant: TenantConfig): string {
  const light = vars(tenant.brand.colorsLight);
  const dark = vars(tenant.brand.colorsDark);
  return `:root{${light}}@media (prefers-color-scheme: dark){:root{${dark}}}`;
}
