// /llms-full.txt — full reference for LLM crawlers
// Includes the complete methodology, weight tables, threshold tables, and API contract.

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nazivier.vercel.app';

export const dynamic = 'force-static';
export const revalidate = 86400;

export function GET() {
  const body = `# NazivIER — full reference

NazivIER is an internal web application of the Institute for Economic Research (Inštitut za ekonomska raziskovanja, IER) in Ljubljana, Slovenia. It automatically evaluates whether a researcher meets the criteria for promotion to each researcher title under the new IER rulebook on researcher titles (proposed draft of 26 May 2026). The app is open-source (https://github.com/lukatalks/NazivIER), runs at ${SITE_URL}, and is available in Slovenian and English.

## What it does

Given a SICRIS researcher ID (e.g. 33182 for dr. Kaja Primc), the app:

1. Fetches the researcher's full bibliography from the public COBISS bibliography API (https://bib.cobiss.net/biblioweb/authorCobissList/si/slv/cris/{id}/T.CI.Ydesc/1800/{currentYear}). Each entry includes a COBISS typology code, year, parent journal/book title, and a COBISS unit ID.
2. Fetches the researcher's OpenAlex profile (https://api.openalex.org/authors/orcid:{orcid} when ORCID known, otherwise a name search filtered by the IER institution ID I4210112708). Returns cited_by_count, h-index, works_count.
3. Maps each publication to a weight per Annex 3 of the rulebook (see Weight table below).
4. Multiplies by the authorship factor (default 0.7 = equal authorship; user can override per publication).
5. Sums into total equivalents (Pogoj 1).
6. Checks citations OR external-project FTE against the per-title threshold (Pogoj 2).
7. Checks leadership FTE/years (Pogoj 3) — manual input.
8. Determines eligibility for every title from sodelavec up to svetnik in all three title groups (scientific, professional-research, development).
9. Returns a per-criterion pass/fail breakdown with the publication-level table that fed each calculation.

## Title hierarchy (Annex 1 of the rulebook)

Three title groups, four career stages each:

| Career stage | Scientific | Professional-research | Development |
|---|---|---|---|
| I (start) | asistent / asistent z magisterijem | asistent / višji asistent | razvijalec / višji razvijalec |
| II (postdoc) | asistent z doktoratom / znanstveni sodelavec | višji strokovno-raziskovalni asistent / strokovno-raziskovalni sodelavec | samostojni razvijalec / razvojni sodelavec |
| III (established) | višji znanstveni sodelavec | višji strokovno-raziskovalni sodelavec | višji razvojni sodelavec |
| IV (leading) | znanstveni svetnik | strokovno-raziskovalni svetnik | razvojni svetnik |

## Weight table (Annex 3 of the rulebook)

| Weight | Typology codes |
|---|---|
| 1.0 | 1.01 / 1.02 in Q1 or Q2 (1A1/1A2 in COBISS); 1.16 monograph chapter; 2.01 scientific monograph; 2.24 patent with full examination |
| 0.7 | 1.01 / 1.02 outside Q1/Q2; 1.03 other scientific article; 1.06 invited conference paper; 1.07 invited professional paper; 2.03 academic textbook; 2.18 scientific film; 2.21 software; 2.22 new variety; 2.27 scientific dictionary; 2.28 critical edition; 2.31 conference proceedings |
| 0.5 | 1.10/1.11 invited abstracts; 2.02 professional monograph; 2.06 dictionary/encyclopedia; 2.32 domestic conference proceedings; 3.14 lecture at foreign university; 3.16 invited conference talk |
| 0.3 | 1.04/1.05 professional/popular article; 1.08 conference paper; 1.17/1.18/1.26 chapter in monograph or dictionary; 2.04 secondary school textbook; 2.12 research report; 2.13 study; 2.15 expert opinion; 2.20 research data; 2.23 patent application; 2.30 non-reviewed conference proceedings; 2.33 professional film |
| 0.1 | 1.09 conference paper; 1.12/1.13 abstracts; 1.19 review/critique; 1.20 preface; 1.21 polemic; 1.22 interview; 1.24 bibliography; 1.25 other; 2.05 other teaching material; 2.07 bibliography; 2.14 project documentation; 2.19 radio/TV; 2.25 other monograph; 3.11 radio/TV event; 3.12 exhibition; 3.15 conference talk without proceedings; 3.25 other |

Codes not listed get weight 0.

## Authorship factor (Annex 3)

| Factor | Role |
|---|---|
| 1.0 | Sole author, first author, corresponding/leading author, project leader, principal mentor, sole award recipient |
| 0.7 | Equal authorship, award with multiple recipients, co-mentor, co-editor |
| 0.3 | All other co-authorships |

SICRIS does not expose the corresponding-author flag in its bibliography JSON, so the default is 0.7. The user must override to 1.0 for first / corresponding author on any publication when preparing an actual promotion application.

## Per-title thresholds (Annex 2 + 3)

| Title | Min. equivalents | Min. clean WoS citations | OR external-project FTE | Min. leadership FTE | OR leadership years | Standards required (of 3) |
|---|---|---|---|---|---|---|
| Scientific sodelavec | 3 | 10 | > 0.5 | ≥ 1 | ≥ 1 | 1 |
| Višji znanstveni sodelavec | 10 | 100 | > 3 | ≥ 5 | ≥ 2 | 2 |
| Znanstveni svetnik | 18 | 200 | > 5 | ≥ 10 | ≥ 3 | 2 |
| Strokovno-raziskovalni sodelavec | 3 | 10 | > 0.5 | ≥ 1 | ≥ 1 | 1 |
| Višji strokovno-raziskovalni sodelavec | 10 | 100 | > 3 | ≥ 5 | ≥ 2 | 2 |
| Strokovno-raziskovalni svetnik | 18 | 200 | > 5 | ≥ 10 | ≥ 3 | 2 |
| Razvojni sodelavec | 2 | 5 | > 0.5 | ≥ 1 | ≥ 1 | 1 |
| Višji razvojni sodelavec | 5 | 50 | > 3 | ≥ 5 | ≥ 2 | 2 |
| Razvojni svetnik | 18 | 200 | > 5 | ≥ 10 | ≥ 3 | 2 |

Minimum education (SOK level): 10 (doctorate) for scientific and professional-research; 8 (master's) for development sodelavec / višji sodelavec; 9 (academic master's) for razvojni svetnik.

## API

### GET ${SITE_URL}/api/roster

Returns the IER organization metadata and seeded researcher roster.

\`\`\`json
{
  "organization": {
    "id": "656",
    "code": "0502",
    "fullName": "Inštitut za ekonomska raziskovanja",
    "shortName": "IER",
    "website": "https://www.ier.si",
    "programmeGroups": [...]
  },
  "researchers": [
    { "sicrisId": "33182", "fullName": "dr. Kaja Primc", "role": "Raziskovalka", "email": "kaja.primc@ier.si", "orcid": "0000-0002-8372-3831" },
    ...
  ]
}
\`\`\`

### GET ${SITE_URL}/api/researcher?id={sicrisId}

Returns a full snapshot for one researcher. Accepts either a numeric SICRIS ID or a SICRIS URL.

\`\`\`json
{
  "sicrisId": "33182",
  "profile": { "sicrisId": "33182", "fullName": "dr. Kaja Primc" },
  "publications": [
    {
      "id": "238741507",
      "title": "Can trade unions in Europe afford to act sustainably?",
      "parentTitle": "Sustain. sci. pract. policy",
      "year": 2025,
      "typology": "1.01",
      "typologyDescr": "Izvirni znanstveni članek",
      "journalRank": "Q1"
    }
  ],
  "citations": { "wosCleanCitations": 1234 },
  "openAlex": {
    "openalexId": "https://openalex.org/A...",
    "displayName": "Kaja Primc",
    "orcid": "0000-0002-8372-3831",
    "citedByCount": 1234,
    "hIndex": 12,
    "worksCount": 45,
    "matchType": "orcid"
  },
  "fetchedAt": "2026-05-27T20:30:00.000Z"
}
\`\`\`

Citations are cached for 6 hours, OpenAlex profile for 24 hours.

## Caveats and known limitations

- **Q1/Q2 status** is currently determined heuristically: 1.01/1.02 publications are sorted by impact via SICRIS (T.CI.Ydesc), the top quartile by count of A1/2 markers is tagged Q1, the next Q2. A SCImago ISSN lookup is planned to replace this in the next version.
- **Corresponding author** is not exposed by SICRIS, so the authorship factor defaults to 0.7 (equal authorship). For an actual promotion application, the user must mark first / corresponding author per publication to set the factor to 1.0.
- **Citations** are from OpenAlex \`cited_by_count\`, which includes self-citations. Strict WoS clean citations (autocitati izključeni) tend to be 5–15 % lower.
- **Project leadership** (Standard 3) is not auto-computed; entered manually using the ARIS Category-A FTE convention.

## Source code and license

- Source: https://github.com/lukatalks/NazivIER (MIT)
- Built with Next.js 16, TypeScript, Tailwind CSS, next-intl
- Hosted on Vercel
- Maintained by: developer collaboration with the Institute for Economic Research

## About the Institute for Economic Research (IER)

The Institute for Economic Research (Inštitut za ekonomska raziskovanja, IER) is a public research institution in Ljubljana, Slovenia, founded in 1965. SICRIS organization ID: 656; ARIS registry code: 0502. The institute hosts four programme groups (mednarodna ekonomija, gospodarski razvoj, strateško planiranje, socialni razvoj) and ~20 researchers. Director: dr. Damjan Kavaš. Address: Kardeljeva ploščad 17, 1000 Ljubljana, Slovenia. Website: https://www.ier.si.
`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  });
}
