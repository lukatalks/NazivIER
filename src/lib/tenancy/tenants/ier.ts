// Tenant #1 — Inštitut za ekonomska raziskovanja (IER).
//
// This is the original NazivIER deployment, now expressed as the first tenant of
// the white-label platform. Its brand colours mirror the legacy globals.css
// defaults exactly, and its roster + organisation reuse the existing seed, so
// extracting IER into a tenant is behaviour-preserving.

import { IER_ORGANIZATION, IER_ROSTER_SEED } from '@/lib/sicris/roster';
import type { TenantConfig } from '@/lib/tenancy/types';

export const IER_TENANT: TenantConfig = {
  id: 'ier',
  hosts: ['nazivier.vercel.app', 'naziv.ier.si', 'localhost', '127.0.0.1'],
  brand: {
    productName: 'NazivIER',
    instituteNameSl: 'Inštitut za ekonomska raziskovanja',
    instituteNameEn: 'Institute for Economic Research',
    instituteShort: 'IER',
    websiteUrl: 'https://www.ier.si',
    logoLight: '/brand/ier/ier-logo.png',
    logoDark: '/brand/ier/ier-logo-dark.png',
    // Mirrors globals.css :root + dark @media exactly (IER coral #a92825).
    colorsLight: {
      primary: '#a92825',
      primaryForeground: '#ffffff',
      accent: '#a92825',
      accentSoft: '#f5e6e2',
      mutedBg: '#f5f3f1',
    },
    colorsDark: {
      primary: '#d63a37',
      primaryForeground: '#ffffff',
      accent: '#f3a39e',
      accentSoft: '#2a1817',
    },
  },
  sources: {
    sicrisOrgId: IER_ORGANIZATION.id, // '656'
    arisCode: IER_ORGANIZATION.code, // '0502'
    openAlexInstitutionId: 'I4210104025', // Institute for Economic Research, Ljubljana
    projectsUrl: 'https://www.ier.si/projekti/',
    staffPage: IER_ORGANIZATION.staffPage,
  },
  organization: IER_ORGANIZATION,
  roster: IER_ROSTER_SEED,
  ruleset: 'aris-baseline-v2.2',
  locales: ['sl', 'en'],
  defaultLocale: 'sl',
};
