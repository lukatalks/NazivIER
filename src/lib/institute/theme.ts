// Generates the institute's CSS-variable override block, injected into the layout.
// It overrides only the brand-specific custom properties defined in globals.css
// (primary / accent / accent-soft / muted-bg) for both light and dark schemes;
// all other tokens fall back to the globals.css defaults.
//
// For IER the emitted values equal the globals.css defaults (visual no-op); the
// point is that a new institute re-themes the whole app from its colour set
// alone, without editing globals.css.

import type { InstituteColorSet, InstituteConfig } from '@/lib/institute/types';

function vars(c: InstituteColorSet): string {
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

export function instituteThemeCss(institute: InstituteConfig): string {
  const light = vars(institute.brand.colorsLight);
  const dark = vars(institute.brand.colorsDark);
  return `:root{${light}}@media (prefers-color-scheme: dark){:root{${dark}}}`;
}
