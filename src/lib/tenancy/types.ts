// Tenant descriptor for white-label multi-tenancy.
//
// One Habilis deployment serves many institutes. Each institute is a `TenantConfig`
// resolved at request time from the incoming Host header (see resolve.ts). The
// scoring engine is shared; everything that differs per institute lives here:
// branding, data-source identifiers, roster, and the ruleset reference.
//
// Adding an institute = one new file under tenancy/tenants/ + an entry in
// registry.ts + a domain pointed at the deployment. No engine changes.

import type { RosterEntry } from '@/lib/sicris/roster';
import type { RulesetId } from '@/lib/tenancy/ruleset';

/** A set of brand colours for one colour scheme (light or dark). */
export interface TenantColorSet {
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

export interface TenantBrand {
  /** White-label product name shown in this tenant's instance (e.g. "NazivIER"). */
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
  colorsLight: TenantColorSet;
  colorsDark: TenantColorSet;
}

/** External data-source identifiers used by the SICRIS / OpenAlex / projects layers. */
export interface TenantSources {
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
export interface TenantOrganization {
  id: string;
  code: string;
  fullName: string;
  shortName: string;
  website: string;
  staffPage: string;
  programmeGroups: { code: string; name: string; lead?: string }[];
}

export interface TenantConfig {
  /** Stable slug; also the default subdomain label (e.g. "ier"). */
  id: string;
  /** Hostnames (lowercase, no port) that resolve to this tenant. */
  hosts: string[];
  brand: TenantBrand;
  sources: TenantSources;
  organization: TenantOrganization;
  /** Seed roster. Phase 1 may switch to a dynamic SICRIS pull by `sources.sicrisOrgId`. */
  roster: RosterEntry[];
  /** Which rulebook this tenant scores against. */
  ruleset: RulesetId;
  locales: string[];
  defaultLocale: string;
}
