// /llms.txt – concise summary for LLM crawlers per https://llmstxt.org

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nazivier.vercel.app';

export const dynamic = 'force-static';
export const revalidate = 86400;

export function GET() {
  const body = `# NazivIER

> Internal web app of the Institute for Economic Research (IER, Ljubljana, Slovenia) that automatically calculates whether a researcher meets the criteria for promotion to each researcher title under the new IER rulebook (draft 26 May 2026). Bibliography is pulled live from SICRIS (cris.cobiss.net), citations from OpenAlex (openalex.org).

The tool maps each publication to a COBISS typology code, applies the weights from Annex 3 of the rulebook, multiplies by the authorship factor, sums to equivalents, and checks each of the three "national / internationally comparable standards" (Pogoj 1/2/3) per title from sodelavec through svetnik. It returns a per-criterion pass/fail breakdown with a publication-level table – so a researcher preparing a promotion application can see, in one screen, why they are or are not eligible.

The site is available in Slovenian (primary, ${SITE_URL}) and English (${SITE_URL}/en). Methodology and source data are public; the app itself runs purely on public APIs (SICRIS + OpenAlex) with no user authentication.

## Docs

- [Full reference (llms-full.txt)](${SITE_URL}/llms-full.txt): full API documentation, methodology spec, weight tables, threshold tables.
- [GitHub repository](https://github.com/lukatalks/NazivIER): source code, README, tests.

## API

- [/api/roster](${SITE_URL}/api/roster): JSON list of IER researchers with SICRIS IDs and ORCIDs.
- [/api/researcher?id={sicrisId}](${SITE_URL}/api/researcher?id=33182): JSON snapshot for one researcher – publications with typology codes, OpenAlex profile (h-index, citations), Q1/Q2 heuristic.

## Data sources

- [SICRIS researcher bibliographies](https://bib.cobiss.net/biblioweb/authorCobissList/si/slv/cris/): public JSON, no auth, run by IZUM.
- [OpenAlex authors API](https://api.openalex.org/authors): public, aggregates Web of Science, Scopus, Crossref, PubMed.
- [IER staff page](https://www.ier.si/zaposleni): authoritative roster.

## Optional

- [GitHub README](https://github.com/lukatalks/NazivIER/blob/main/README.md): build/run instructions, architecture.
- [Rulebook docx in repo](https://github.com/lukatalks/NazivIER/blob/main/docs/pravilnik.docx): source for all weights and thresholds.
- [COBISS typology PDF](https://home.izum.si/COBISS/bibliografije/Tipologija_slv.pdf): authoritative typology codes.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
