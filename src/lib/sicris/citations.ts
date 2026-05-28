// SICRIS / COBISS "čisti citati" scraper.
//
// Why we need a dedicated SICRIS source even though OpenAlex already exposes
// citations:
//   - ARIS evaluators and the IER rulebook reviewers compare the candidate's
//     numbers against the "čisti citati po WoS" field that SICRIS shows on
//     every researcher's profile. OpenAlex aggregates WoS + Scopus + Crossref +
//     PubMed, so it's broader but does NOT match what the rulebook reviewers
//     check first. Showing both lets the user see the official figure and the
//     broader-coverage diagnostic side by side.
//
// How it works:
//   1) POST to https://bib.cobiss.net/biblioweb/cit/si/slv/citrsr/{id}
//      with form data { unit=Z, citBase=W|S|WS, citType=H, outputFormat=J }
//      The endpoint replies with a 302 redirect to a generated JSON file
//      at https://bib.cobiss.net/bibliographies/si/webBiblio/hindex_{ts}_{id}.json
//   2) GET that JSON URL → parse:
//        - citHIndexData.HIndBaseData[].HIndex          → h-index for the base
//        - citHIndexData.citData[].citBaseData.CI       → total clean citations
//        - citUnitData[].biblData                       → per-publication CI
//
// The endpoint computes "čisti citati" by stripping self-citations using the
// COBIB.SI ↔ WoS/Scopus links curated by IZUM, so the numbers match what
// ARIS / IER would see when running the official "habilitacijski izpis".
//
// Cache TTL: 7 days. Citation totals change slowly and this is the most
// expensive call in the snapshot path (two round-trips + server-side
// generation), so we want generous caching.

import { cached } from '@/lib/cache/redis';

const FORM_URL = 'https://bib.cobiss.net/biblioweb/cit/si/slv/citrsr';
const UA = 'NazivIER/0.1 (Institute for Economic Research, internal tool)';
const TTL_SEC = 60 * 60 * 24 * 7;

export type SicrisCitBase = 'W' | 'S';

export interface SicrisCitationSummary {
  /** "W" (WoS) or "S" (Scopus). */
  base: SicrisCitBase;
  /** Number of distinct citing references after self-citation removal. */
  cleanCitations: number;
  /** SICRIS-computed h-index for the base. */
  hIndex: number;
  /** Per-publication clean citation counts keyed by COBISS bibliographic ID. */
  perPublication: Record<string, number>;
  /** Source URL of the generated JSON file (useful for an audit link). */
  sourceUrl: string;
}

/** Two-step SICRIS scrape:
 *  POST the form (302) → follow Location → GET the JSON. */
export async function fetchSicrisCitations(
  sicrisId: string,
  base: SicrisCitBase = 'W',
): Promise<SicrisCitationSummary | null> {
  const cacheKey = `sicris:cit:${sicrisId}:${base}`;
  return cached(cacheKey, TTL_SEC, () => _fetchSicrisCitations(sicrisId, base));
}

async function _fetchSicrisCitations(
  sicrisId: string,
  base: SicrisCitBase,
): Promise<SicrisCitationSummary | null> {
  // Step 1: POST the form. Don't follow redirects – we want the Location header.
  const body = new URLSearchParams({
    uniqueCode: sicrisId,
    fullName: `[${sicrisId}]`,
    fromYear: '',
    toYear: '',
    fromYearPub: '',
    toYearPub: '',
    unit: 'Z', // znanstvena dela (matches what evaluators check)
    citBase: base,
    citType: 'H', // h-index + total clean citations (lighter than HY)
    outputFormat: 'J', // JSON
    email: '',
  });

  let location: string | null = null;
  try {
    const post = await fetch(`${FORM_URL}/${sicrisId}`, {
      method: 'POST',
      headers: {
        'User-Agent': UA,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
      redirect: 'manual',
    });
    if (post.status === 302 || post.status === 303 || post.status === 301) {
      location = post.headers.get('location');
    }
  } catch {
    return null;
  }

  if (!location) return null;

  // Step 2: GET the generated JSON. We deliberately do NOT send an Accept
  // header – COBISS serves the generated JSON file as application/json but
  // its RESTEasy backend 500s when we explicitly negotiate Accept (returns
  // "RESTEASY003635: No match for accept header"). Letting the server reply
  // with whatever content-type it picks works. Tiny retry because COBISS
  // occasionally needs a moment to flush the file to disk between the
  // redirect and our GET.
  const delays = [0, 800, 2500];
  let json: unknown = null;
  for (const delay of delays) {
    if (delay > 0) await new Promise((r) => setTimeout(r, delay));
    try {
      const res = await fetch(location, {
        headers: { 'User-Agent': UA },
      });
      if (res.ok) {
        const text = await res.text();
        try {
          json = JSON.parse(text);
          break;
        } catch {
          /* try again */
        }
      }
    } catch {
      /* try again */
    }
  }
  if (!json) return null;

  return parseSicrisCitations(json, base, location);
}

/** Pure parser – exported for unit-testability. */
export function parseSicrisCitations(
  raw: unknown,
  base: SicrisCitBase,
  sourceUrl: string,
): SicrisCitationSummary | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const hidx = obj.citHIndexData as Record<string, unknown> | undefined;
  if (!hidx) {
    // Sometimes the endpoint returns {} for researchers with zero indexed
    // works – still a valid response.
    return {
      base,
      cleanCitations: 0,
      hIndex: 0,
      perPublication: {},
      sourceUrl,
    };
  }

  const baseLabel = base === 'W' ? 'WoS' : 'Scopus';

  const hArr = Array.isArray(hidx.HIndBaseData) ? hidx.HIndBaseData : [];
  const cArr = Array.isArray(hidx.citData) ? hidx.citData : [];
  const hRec = hArr.find((h: unknown) => {
    const r = h as Record<string, unknown>;
    return r.citBase === baseLabel;
  }) as Record<string, unknown> | undefined;
  const cRec = cArr.find((c: unknown) => {
    const inner = (c as Record<string, unknown>).citBaseData as Record<string, unknown> | undefined;
    return inner?.citBase === baseLabel;
  }) as Record<string, unknown> | undefined;
  const cInner = cRec?.citBaseData as Record<string, unknown> | undefined;

  const hIndex = numeric(hRec?.HIndex);
  const cleanCitations = numeric(cInner?.CI);

  const perPublication: Record<string, number> = {};
  const units = Array.isArray(obj.citUnitData) ? obj.citUnitData : [];
  for (const u of units) {
    const unit = u as Record<string, unknown>;
    const bibl = unit.biblData as Record<string, unknown> | undefined;
    const cits = Array.isArray(unit.citData) ? unit.citData : [];
    const match = cits.find((c: unknown) => {
      const inner = (c as Record<string, unknown>).citBaseData as Record<string, unknown> | undefined;
      return inner?.citBase === baseLabel;
    }) as Record<string, unknown> | undefined;
    const inner = match?.citBaseData as Record<string, unknown> | undefined;
    const id = bibl?.id ? String(bibl.id) : null;
    const ci = numeric(inner?.CI);
    if (id) perPublication[id] = ci;
  }

  return {
    base,
    cleanCitations,
    hIndex,
    perPublication,
    sourceUrl,
  };
}

function numeric(v: unknown): number {
  if (v == null) return 0;
  const n = Number(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
