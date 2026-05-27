'use client';

import { useTranslations } from 'next-intl';

import { Link, usePathname } from '@/i18n/navigation';
import { locales, type Locale } from '@/i18n/config';

interface Props {
  locale: Locale;
}

export function LanguageSwitcher({ locale }: Props) {
  const t = useTranslations('languageSwitcher');
  const pathname = usePathname();

  return (
    <nav aria-label={t('label')} className="inline-flex items-center gap-1 text-xs">
      <span className="sr-only">{t('label')}: </span>
      {locales.map((l, i) => (
        <span key={l}>
          {i > 0 ? <span className="px-1 text-[var(--muted)]">·</span> : null}
          <Link
            href={pathname}
            locale={l}
            className={
              l === locale
                ? 'font-semibold text-[var(--primary)]'
                : 'text-[var(--muted)] hover:text-[var(--primary)] underline-offset-4 hover:underline'
            }
            hrefLang={l}
            aria-current={l === locale ? 'true' : undefined}
          >
            {t(l)}
          </Link>
        </span>
      ))}
    </nav>
  );
}
