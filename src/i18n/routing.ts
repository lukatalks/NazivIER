import { defineRouting } from 'next-intl/routing';

import { defaultLocale, locales } from './config';

export const routing = defineRouting({
  locales: [...locales],
  defaultLocale,
  // Strategy "as-needed" hides /sl from the URL (it becomes the bare /),
  // and uses /en for the secondary locale. Best for the IER primary-Slovenian case.
  localePrefix: 'as-needed',
});
