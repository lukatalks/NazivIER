// JSON-LD for SEO and GenAI optimization.
// Lists WebApplication, Organization, and Dataset schemas so search engines
// and LLM crawlers understand what NazivIER is. All content is static
// (built from i18n strings + roster constants), so there is no XSS risk
// from the inline <script> tag – JSON.stringify never produces </script>
// in its output, and `<` is escaped to < below as belt-and-suspenders.

import type { Locale } from '@/i18n/config';
import { INSTITUTE } from '@/lib/institute';

interface Props {
  locale: Locale;
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nazivier.vercel.app';

export function StructuredData({ locale }: Props) {
  const url = locale === 'sl' ? SITE_URL : `${SITE_URL}/${locale}`;

  const { brand, organization } = INSTITUTE;

  const name =
    locale === 'sl'
      ? `${brand.productName} – kalkulator raziskovalnih nazivov`
      : `${brand.productName} – researcher-title calculator`;

  const description =
    locale === 'sl'
      ? `Interno orodje ${brand.instituteNameSlGenitive} za samodejen izračun raziskovalnih nazivov po novem pravilniku, na podlagi podatkov iz SICRIS in OpenAlex.`
      : `Internal tool of the ${brand.instituteNameEn} (${brand.instituteShort}, ${brand.city}) for automatic calculation of researcher titles under the new rulebook, powered by SICRIS and OpenAlex.`;

  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        '@id': `${SITE_URL}/#app`,
        name,
        url,
        applicationCategory: 'EducationApplication',
        operatingSystem: 'Any',
        description,
        inLanguage: ['sl-SI', 'en-US'],
        isAccessibleForFree: true,
        creator: { '@id': `${SITE_URL}/#org` },
        publisher: { '@id': `${SITE_URL}/#org` },
        about: {
          '@type': 'CreativeWork',
          name:
            locale === 'sl'
              ? `Pravilnik o raziskovalnih nazivih na ${brand.instituteNameSlLocative} (predlog 26. 5. 2026)`
              : `Rulebook on researcher titles at the ${brand.instituteNameEn} (draft 26 May 2026)`,
        },
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' },
      },
      {
        '@type': 'ResearchOrganization',
        '@id': `${SITE_URL}/#org`,
        name: organization.fullName,
        alternateName: organization.shortName,
        url: organization.website,
        identifier: [
          { '@type': 'PropertyValue', propertyID: 'SICRIS', value: organization.id },
          { '@type': 'PropertyValue', propertyID: 'ARIS', value: organization.code },
        ],
        address: {
          '@type': 'PostalAddress',
          streetAddress: organization.address.streetAddress,
          postalCode: organization.address.postalCode,
          addressLocality: organization.address.addressLocality,
          addressCountry: organization.address.addressCountry,
        },
      },
      {
        '@type': 'Dataset',
        '@id': `${SITE_URL}/#dataset`,
        name:
          locale === 'sl'
            ? `Bibliografski kazalci raziskovalcev ${brand.instituteShort} po metodologiji ${brand.productName}`
            : `${brand.instituteShort} researcher bibliometric indicators via ${brand.productName} methodology`,
        description:
          locale === 'sl'
            ? `Izvedeni kazalci na podlagi SICRIS bibliografije in OpenAlex citatov, uporabljeni za izračun pogojev po Prilogi 3 pravilnika ${brand.instituteShort}.`
            : `Derived indicators based on SICRIS bibliography and OpenAlex citations, used to compute eligibility per Annex 3 of the ${brand.instituteShort} rulebook.`,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        creator: { '@id': `${SITE_URL}/#org` },
        isBasedOn: [
          { '@type': 'Dataset', name: 'SICRIS', url: 'https://cris.cobiss.net/ecris/si/' },
          { '@type': 'Dataset', name: 'OpenAlex', url: 'https://openalex.org' },
        ],
      },
    ],
  };

  // Escape `<` to < per https://benadam.me/thoughts/react-script-tags/
  // – protects against </script> sneaking in via any future dynamic content.
  const json = JSON.stringify(graph).replace(/</g, '\\u003c');

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- content is fully static, escaped above
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
