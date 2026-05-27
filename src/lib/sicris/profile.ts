// Extract minimal profile info from the public bibliography HTML page.
// The biblio form page has the researcher name embedded in <h3>:
//   <h3 class="text-center">dr. Kaja Primc [33182]</h3>
// We use this to drive downstream OpenAlex lookup.

const BIBLIO_BASE = 'https://bib.cobiss.net/biblioweb';

const UA = 'NazivIER/0.1 (Institute for Economic Research, internal tool)';

export interface SicrisProfile {
  sicrisId: string;
  fullName: string;
  titlePrefix?: string; // "dr." typically
}

export async function fetchProfile(sicrisId: string): Promise<SicrisProfile> {
  const res = await fetch(`${BIBLIO_BASE}/biblio/si/slv/cris/${sicrisId}`, {
    headers: { 'User-Agent': UA, Accept: 'text/html' },
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) {
    throw new Error(`SICRIS profile fetch failed (${res.status}) for ${sicrisId}`);
  }
  const html = await res.text();
  const m = html.match(/<h3[^>]*>\s*((?:dr\.|mag\.|prof\.)?\s*[^[<]+)\s*\[(\d+)\]\s*<\/h3>/i);
  if (!m) {
    return { sicrisId, fullName: `SICRIS #${sicrisId}` };
  }
  const raw = m[1].trim();
  const titleMatch = raw.match(/^(dr\.|mag\.|prof\.)\s*/i);
  return {
    sicrisId,
    titlePrefix: titleMatch?.[1],
    fullName: raw,
  };
}
