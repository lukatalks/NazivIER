// IER build — Inštitut za ekonomska raziskovanja.
//
// This is the original NazivIER deployment, expressed as a white-label institute
// config. Brand colours mirror the legacy globals.css defaults exactly, and the
// roster + organisation reuse the existing seed, so it is behaviour-preserving.
//
// Template for a new institute: copy this file, change every value, drop the
// institute's logos under /public/brand/<id>/, then point INSTITUTE in ./index.ts
// at the new config.

import { IER_ORGANIZATION, IER_ROSTER_SEED } from '@/lib/sicris/roster';
import type { InstituteConfig } from '@/lib/institute/types';

export const IER_INSTITUTE: InstituteConfig = {
  id: 'ier',
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
