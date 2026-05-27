// Dynamic OG image per locale. Next.js wires this automatically into
// <meta property="og:image"> + <meta name="twitter:image">.

import { ImageResponse } from 'next/og';

import { type Locale, locales } from '@/i18n/config';

// `runtime` must be unset when paired with generateStaticParams; the Node
// runtime handles ImageResponse just fine on Vercel.
export const alt = 'NazivIER — kalkulator raziskovalnih nazivov IER';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Tells the build to render both /sl/opengraph-image and /en/opengraph-image.
export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

interface Props {
  params: Promise<{ locale: string }>;
}

const COPY: Record<Locale, { eyebrow: string; title: string; sub: string; tagline: string }> = {
  sl: {
    eyebrow: 'Inštitut za ekonomska raziskovanja',
    title: 'NazivIER',
    sub: 'Kalkulator raziskovalnih nazivov',
    tagline: 'Avtomatski izračun pogojev iz SICRIS-a in OpenAlex.',
  },
  en: {
    eyebrow: 'Institute for Economic Research',
    title: 'NazivIER',
    sub: 'Researcher-title calculator',
    tagline: 'Automatic eligibility check from SICRIS and OpenAlex.',
  },
};

export default async function Image({ params }: Props) {
  const { locale: raw } = await params;
  const locale = (locales as readonly string[]).includes(raw) ? (raw as Locale) : 'sl';
  const c = COPY[locale];

  // IER brand red + a darker bleed for depth.
  const bgPrimary = '#a92825';
  const bgDeep = '#7a1c1a';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '64px 80px',
          background: `linear-gradient(135deg, ${bgPrimary} 0%, ${bgDeep} 100%)`,
          color: '#ffffff',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        }}
      >
        {/* Top row: small IER mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 12,
              background: '#ffffff',
              color: bgPrimary,
              fontSize: 32,
              fontWeight: 800,
              letterSpacing: -1,
            }}
          >
            IER
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 22,
              fontWeight: 500,
              opacity: 0.92,
              lineHeight: 1.25,
            }}
          >
            {c.eyebrow}
          </div>
        </div>

        {/* Title block */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          <div
            style={{
              fontSize: 140,
              fontWeight: 800,
              letterSpacing: -4,
              lineHeight: 1,
            }}
          >
            {c.title}
          </div>
          <div
            style={{
              fontSize: 48,
              fontWeight: 500,
              opacity: 0.95,
              lineHeight: 1.15,
            }}
          >
            {c.sub}
          </div>
          <div
            style={{
              marginTop: 12,
              fontSize: 26,
              fontWeight: 400,
              opacity: 0.85,
              maxWidth: 900,
              lineHeight: 1.35,
            }}
          >
            {c.tagline}
          </div>
        </div>

        {/* Bottom row: URL + source tags */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: 22,
            fontWeight: 500,
            opacity: 0.85,
          }}
        >
          <div>nazivier.vercel.app</div>
          <div style={{ display: 'flex', gap: 14 }}>
            <span
              style={{
                padding: '6px 14px',
                border: '1.5px solid rgba(255,255,255,0.55)',
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              SICRIS
            </span>
            <span
              style={{
                padding: '6px 14px',
                border: '1.5px solid rgba(255,255,255,0.55)',
                borderRadius: 999,
                fontSize: 18,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              OpenAlex
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
