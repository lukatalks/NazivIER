import { setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

import { TitleCalculator } from '@/components/TitleCalculator';
import { type Locale, locales } from '@/i18n/config';

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!(locales as readonly string[]).includes(locale)) notFound();
  setRequestLocale(locale);

  return <TitleCalculator locale={locale as Locale} />;
}
