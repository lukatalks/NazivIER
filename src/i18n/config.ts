export const locales = ['sl', 'en'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'sl';

export const localeNames: Record<Locale, string> = {
  sl: 'Slovenščina',
  en: 'English',
};
