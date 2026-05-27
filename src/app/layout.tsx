import type { Metadata } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: 'NazivIER — kalkulator raziskovalnih nazivov IER',
  description:
    'Interno orodje Inštituta za ekonomska raziskovanja za samodejen izračun raziskovalnih nazivov po novem pravilniku, na podlagi podatkov iz SICRIS.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sl" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
