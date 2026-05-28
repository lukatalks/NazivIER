// Root layout – minimal pass-through. The real <html>/<body> lives in
// `[locale]/layout.tsx` so that the lang attribute matches the active locale.

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
