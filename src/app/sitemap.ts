import type { MetadataRoute } from 'next';

import { locales } from '@/i18n/config';
import { routing } from '@/i18n/routing';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nazivier.vercel.app';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Per Google: list each URL once, declare hreflang alternates via the
  // `alternates.languages` field. We point each locale entry at its own URL
  // and cross-link the other locale + an `x-default` to the Slovenian root.
  return locales.map((locale) => {
    const url = locale === routing.defaultLocale ? SITE_URL : `${SITE_URL}/${locale}`;
    const languages = Object.fromEntries(
      locales.map((l) => [l, l === routing.defaultLocale ? SITE_URL : `${SITE_URL}/${l}`]),
    );
    languages['x-default'] = SITE_URL;

    return {
      url,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: locale === routing.defaultLocale ? 1.0 : 0.8,
      alternates: { languages },
    };
  });
}
