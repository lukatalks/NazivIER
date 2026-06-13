// Per-institute configuration — the single customisation surface for a
// white-label build.
//
// This deployment serves ONE institute. To create a build for another institute,
// copy ./ier.ts, edit the config + drop its brand assets under /public/brand,
// and point INSTITUTE (see ./index.ts) at the new config. The scoring engine and
// all components read everything institute-specific from here, so a new institute
// is a config change, not a code fork of the engine.

import type { RosterEntry } from '@/lib/sicris/roster';
import type { RulesetId } from '@/lib/institute/ruleset';

/** A set of brand colours for one colour scheme (light or dark). */
export interface InstituteColorSet {
  /** Primary CTA / brand fill. */
  primary: string;
  /** Foreground on top of `primary`. */
  primaryForeground: string;
  /** Links / eyebrow accent. */
  accent: string;
  /** Soft tinted-area wash. */
  accentSoft: string;
  /** Optional muted surface tint that complements the brand colour. */
  mutedBg?: string;
}

export interface InstituteBrand {
  /** Product name shown in this institute's instance (e.g. "NazivIER"). */
  productName: string;
  instituteNameSl: string;
  instituteNameEn: string;
  /** Short acronym (e.g. "IER"). */
  instituteShort: string;
  websiteUrl: string;
  /** Logo for light surfaces (path under /public). */
  logoLight: string;
  /** Logo for dark surfaces (path under /public). */
  logoDark: string;
  colorsLight: InstituteColorSet;
  colorsDark: InstituteColorSet;
}

/** External data-source identifiers used by the SICRIS / OpenAlex / projects layers. */
export interface InstituteSources {
  /** SICRIS organisation id (e.g. IER = "656"). */
  sicrisOrgId: string;
  /** ARIS programme code (e.g. IER = "0502"). */
  arisCode: string;
  /** OpenAlex institution id for the name-search institutional filter; null = name-only. */
  openAlexInstitutionId: string | null;
  /** Institute projects listing URL for the Pogoj-3 leadership audit; null = unsupported. */
  projectsUrl: string | null;
  /** Staff page (informational / audit link); null = unknown. */
  staffPage: string | null;
}

/** Organisation metadata surfaced in the UI, JSON-LD and roster API. */
export interface InstituteOrganization {
  id: string;
  code: string;
  fullName: string;
  shortName: string;
  website: string;
  staffPage: string;
  programmeGroups: { code: string; name: string; lead?: string }[];
}

export interface InstituteConfig {
  /** Stable slug; used for asset folders and diagnostics (e.g. "ier"). */
  id: string;
  brand: InstituteBrand;
  sources: InstituteSources;
  organization: InstituteOrganization;
  /** Seed roster. A future build may switch to a dynamic SICRIS pull by `sources.sicrisOrgId`. */
  roster: RosterEntry[];
  /** Which rulebook this institute scores against. */
  ruleset: RulesetId;
  locales: string[];
  defaultLocale: string;
}
