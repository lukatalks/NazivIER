import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';

import { VersionWatcher } from '@/components/VersionWatcher';
import { type Locale, locales } from '@/i18n/config';
import { routing } from '@/i18n/routing';
import { getTenant } from '@/lib/tenancy/server';
import { tenantThemeCss } from '@/lib/tenancy/theme';

import '../globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nazivier.vercel.app';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Lock zoom on mobile: pinch-zoom / double-tap-zoom break the dense table
  // layout and the fixed banners. Trade-off: this reduces low-vision zoom
  // (WCAG 1.4.4); acceptable for an internal tool, revert if accessibility
  // feedback comes in.
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0d12' },
  ],
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: raw } = await params;
  const locale = (locales as readonly string[]).includes(raw)
    ? (raw as Locale)
    : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: 'site' });
  const tenant = await getTenant();

  const languageAlternates = Object.fromEntries(
    locales.map((l) => [l, l === routing.defaultLocale ? '/' : `/${l}`]),
  );

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('title'), template: `%s · ${tenant.brand.productName}` },
    description: t('description'),
    applicationName: tenant.brand.productName,
    authors: [{ name: tenant.brand.instituteNameSl }],
    keywords: [
      'IER',
      'Inštitut za ekonomska raziskovanja',
      'raziskovalni nazivi',
      'pravilnik o raziskovalnih nazivih',
      'SICRIS',
      'COBISS',
      'ARIS',
      'znanstveni sodelavec',
      'znanstveni svetnik',
      'OpenAlex',
      'bibliometrija',
      'researcher titles',
      'Slovenia research evaluation',
      'NazivIER',
    ],
    alternates: {
      canonical: locale === routing.defaultLocale ? '/' : `/${locale}`,
      languages: languageAlternates,
    },
    openGraph: {
      title: t('title'),
      description: t('ogDescription'),
      url: locale === routing.defaultLocale ? SITE_URL : `${SITE_URL}/${locale}`,
      siteName: tenant.brand.productName,
      locale: locale === 'sl' ? 'sl_SI' : 'en_US',
      alternateLocale: locale === 'sl' ? ['en_US'] : ['sl_SI'],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: t('title'),
      description: t('ogDescription'),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large' },
    },
    formatDetection: { email: false, address: false, telephone: false },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  setRequestLocale(locale);

  const tenant = await getTenant();

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {/* Per-tenant brand colour overrides. For IER these equal the globals.css
            defaults (visual no-op); a new tenant re-themes the whole app from its
            colour set alone. String-child <style> (not dangerouslySetInnerHTML):
            the CSS contains no <, > or & so it renders verbatim, and the values
            come only from our static tenant config. */}
        <style id="tenant-theme">{tenantThemeCss(tenant)}</style>
        <NextIntlClientProvider>
          {children}
          <VersionWatcher />
        </NextIntlClientProvider>
        {/* Vercel-side analytics + page insights – no PII, sampled by Vercel,
            collects only path + UA. Activated automatically on Vercel; in
            local dev these components no-op. */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
