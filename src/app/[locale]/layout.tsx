import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import type { Metadata, Viewport } from 'next';

import { VersionWatcher } from '@/components/VersionWatcher';
import { type Locale, locales } from '@/i18n/config';
import { routing } from '@/i18n/routing';

import '../globals.css';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nazivier.vercel.app';

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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

  const languageAlternates = Object.fromEntries(
    locales.map((l) => [l, l === routing.defaultLocale ? '/' : `/${l}`]),
  );

  return {
    metadataBase: new URL(SITE_URL),
    title: { default: t('title'), template: '%s · NazivIER' },
    description: t('description'),
    applicationName: 'NazivIER',
    authors: [{ name: 'Inštitut za ekonomska raziskovanja' }],
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
      siteName: 'NazivIER',
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

  return (
    <html lang={locale} className="h-full antialiased">
      <body className="min-h-full flex flex-col">
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
