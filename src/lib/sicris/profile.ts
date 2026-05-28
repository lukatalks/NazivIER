// Extract minimal profile info from the public bibliography HTML page.
// The biblio form page has the researcher name embedded in <h3>:
//   <h3 class="text-center">dr. Kaja Primc [33182]</h3>
//   <h3 class="text-center">Enia Bearzotti, mag. [54736]</h3>
// We use this to drive downstream OpenAlex lookup and to auto-detect the
// SOK education level so the eligibility check is not blocked by an unset
// dropdown (the most common UX hiccup users hit).

import type { EducationLevel } from '@/lib/types';

const BIBLIO_BASE = 'https://bib.cobiss.net/biblioweb';

const UA = 'NazivIER/0.1 (Institute for Economic Research, internal tool)';

export interface SicrisProfile {
  sicrisId: string;
  /** Full name as it appears in the SICRIS biblio header – may include prefix
   *  ("dr.", "mag.", "prof.") or suffix (", mag."). */
  fullName: string;
  /** First academic prefix detected (dr./mag./prof.). */
  titlePrefix?: string;
  /** Auto-inferred SOK education level (8/9/10) based on the academic marker:
   *  - "dr." (prefix or suffix) → 10 (doktorat)
   *  - "mag." prefix → 9 (znanstveni magisterij, pre-Bologna program)
   *  - "mag." suffix → 9 (Bologna 2nd cycle – at IER staff this is also the
   *    scientific master with defended thesis, per Luka 2026-05-28)
   *  Returns undefined when no marker is detected and falls back to user input. */
  inferredEducationLevel?: EducationLevel;
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
  // Header forms we've seen:
  //   <h3>dr. Kaja Primc [33182]</h3>
  //   <h3>mag. Klemen Koman [18431]</h3>
  //   <h3>Enia Bearzotti, mag. [54736]</h3>
  //   <h3>prof. dr. Foo Bar [...]</h3>
  const m = html.match(/<h3[^>]*>\s*([^[<]+?)\s*\[(\d+)\]\s*<\/h3>/i);
  if (!m) {
    return { sicrisId, fullName: `SICRIS #${sicrisId}` };
  }
  const raw = m[1].trim();
  const titleMatch = raw.match(/^(dr\.|mag\.|prof\.)\s*/i);
  return {
    sicrisId,
    titlePrefix: titleMatch?.[1],
    fullName: raw,
    inferredEducationLevel: inferEducationLevel(raw),
  };
}

/** Detect academic-degree markers in a name and map them to the Slovenian
 *  Qualifications Framework (SOK) level used by Annex 2.
 *
 *  Order matters: we check for doctorate first (covers `dr.`, `prof. dr.`,
 *  and the trailing `, dr.`). Then magisterij. Returns undefined when the
 *  name has no academic marker at all (e.g. `Jane Doe`). */
export function inferEducationLevel(fullName: string): EducationLevel | undefined {
  const name = fullName.toLowerCase();
  // Doctorate markers (most senior degree wins)
  if (/(^|\s)dr\.\s/.test(name) || /,\s*dr\./.test(name)) return 10;
  // Scientific master (both old "mag. Name" and new "Name, mag." forms).
  // Per IER staff convention this is the scientific master with defended
  // thesis – maps to SOK 9 (znanstveni magisterij). Professional Bologna
  // master without thesis (SOK 8, "mag. stroke") is rare at IER and can
  // be overridden in the UI.
  if (/(^|\s)mag\./.test(name) || /,\s*mag\./.test(name)) return 9;
  return undefined;
}
