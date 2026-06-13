import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';

import { INSTITUTE } from '@/lib/institute';

import { routing } from './routing';

// White-label: the messages JSON holds institute-neutral tokens (%PRODUCT%,
// %SHORT%, %INSTITUTE_SL%, …) which are substituted at load with the active
// institute's values. For the IER build every token resolves to the exact legacy
// string, so the rendered copy is identical; a fork themes its copy from config
// alone, with no "IER" left in the shared messages.

/** Display host (no scheme / www / trailing slash) from a URL, e.g.
 *  'https://www.ier.si/projekti/' → 'ier.si/projekti'. */
function hostLabel(url: string | null): string {
  if (!url) return '';
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '');
}

function instituteTokens(): Record<string, string> {
  const { brand, sources } = INSTITUTE;
  const projectsLabel = hostLabel(sources.projectsUrl); // 'ier.si/projekti'
  const projectsHost = projectsLabel.split('/')[0]; // 'ier.si'
  return {
    '%PRODUCT%': brand.productName,
    '%SHORT%': brand.instituteShort,
    '%INSTITUTE_SL%': brand.instituteNameSl,
    '%INSTITUTE_SL_GEN%': brand.instituteNameSlGenitive,
    '%INSTITUTE_EN%': brand.instituteNameEn,
    '%CITY%': brand.city,
    '%PROJECTS_HOST%': projectsHost,
    '%PROJECTS_LABEL%': projectsLabel,
  };
}

function applyTokens(value: unknown, tokens: Record<string, string>): unknown {
  if (typeof value === 'string') {
    let out = value;
    for (const [token, replacement] of Object.entries(tokens)) {
      if (out.includes(token)) out = out.split(token).join(replacement);
    }
    return out;
  }
  if (Array.isArray(value)) return value.map((item) => applyTokens(item, tokens));
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = applyTokens(val, tokens);
    }
    return result;
  }
  return value;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const raw = (await import(`../../messages/${locale}.json`)).default;
  const messages = applyTokens(raw, instituteTokens()) as typeof raw;

  return { locale, messages };
});
