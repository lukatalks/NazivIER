// IER website project scraper.
//
// What it does:
//   - Pulls the current projects shown on https://www.ier.si/projekti/
//   - Parses each card into a typed object: title, slug, funder, dates, leader,
//     project type (domaci-javni / domaci-trzni / tuji-javni / tuji-trzni),
//     and an optional COBISS project code (Šifra projekta).
//   - Exposes a helper that, given a researcher's display name, returns the
//     projects where that researcher is the Vodja (project leader) plus the
//     derived months-as-leader number.
//
// Why this is useful in the rulebook context:
//   - Pogoj 3 (sposobnost vodenja) in Annex 3 measures cumulative leadership
//     FTE and years in a leadership role. The IER website is the institute's
//     own truthful record of who leads which project. By matching the Vodja
//     name field against the researcher's display name we pre-fill the
//     evaluator's leadership inputs so the user doesn't have to type them.
//   - Pogoj 2 alternative (vrednost projektov izven ARIS, FTE A) can be
//     informed by the project type — projects with Naročnik ≠ ARIS contribute
//     to the "izven ARIS" bucket. FTE values are NOT on ier.si, so the
//     monetary side of Pogoj 2 stays a manual entry.
//
// Coverage:
//   - The listing currently shows ~24 active projects (paged once, no
//     load-more). The sitemap reveals ~91 historical project URLs; scraping
//     all detail pages is left as future work because they don't expose
//     Sodelavci (collaborators), only the Vodja field that the list already
//     gives us.
//
// Cache TTL: 24 h. The IER website moves slowly.

import { cached } from '@/lib/cache/redis';

const PROJECTS_URL = 'https://www.ier.si/projekti/';
const UA = 'NazivIER/0.1 (Institute for Economic Research, internal tool)';
const TTL_SEC = 60 * 60 * 24;

export type IerProjectType =
  | 'domaci-javni'
  | 'domaci-trzni'
  | 'tuji-javni'
  | 'tuji-trzni'
  | 'unknown';

export interface IerProject {
  /** WP slug, e.g. "expert-network-for-analytical-support-in-social-policies-enassp" */
  slug: string;
  /** Detail page URL */
  url: string;
  title: string;
  /** "Naročnik" – funder name(s). */
  funder?: string;
  /** "Šifra projekta" – ARIS/CRP code when present (e.g. "CRP V5-2506"). */
  code?: string;
  /** Raw "Trajanje" string, e.g. "1. 9. 2025 do 31. 8. 2028". */
  durationRaw?: string;
  /** Parsed start date (ISO yyyy-mm-dd) when "Trajanje" parses cleanly. */
  startDate?: string;
  endDate?: string;
  /** "Vodja projekta" – leader display name as printed by IER. */
  leader?: string;
  /** Project type from the card filter class. */
  projectType: IerProjectType;
}

/** Fetch and parse all projects currently visible on the IER website. */
export async function fetchIerProjects(): Promise<IerProject[]> {
  // Cache key suffixed with parser revision; bump when the parser changes so
  // earlier (raw-entity) snapshots don't survive a deploy.
  return cached('ier:projects:current:v2', TTL_SEC, async () => {
    try {
      const res = await fetch(PROJECTS_URL, {
        headers: { 'User-Agent': UA, Accept: 'text/html' },
        next: { revalidate: TTL_SEC },
      });
      if (!res.ok) return [];
      const html = await res.text();
      return parseIerProjects(html);
    } catch {
      return [];
    }
  });
}

/** Per-researcher rollup used by the evaluator + MetadataPanel pre-fill. */
export interface ResearcherProjectRollup {
  /** Projects where this researcher is the listed Vodja. */
  led: IerProject[];
  /** Distinct count of led projects. */
  ledCount: number;
  /** Total months across the union of led-project intervals. */
  ledMonthsTotal: number;
  /** Decimal years (ledMonthsTotal / 12), rounded to 1 dp. */
  ledYears: number;
  /** Count of led projects with Naročnik that is not (only) ARIS – useful as
   *  an evidence anchor for Pogoj 2 "izven ARIS". */
  ledExternalCount: number;
  /** Source URL for transparency. */
  sourceUrl: string;
}

/** Match the researcher's projects from the (already-fetched) project list.
 *  Matching is name-based and intentionally lenient: it strips degree
 *  prefixes/suffixes, lower-cases, removes diacritics, and matches if the
 *  Vodja string contains the full »first last« pair in either order. */
export function projectsForResearcher(
  projects: IerProject[],
  fullName: string,
): ResearcherProjectRollup {
  const normalisedName = normaliseName(fullName);
  const tokens = nameTokens(normalisedName);
  const led = projects.filter((p) => {
    if (!p.leader) return false;
    const v = normaliseName(p.leader);
    // Require all multi-letter tokens of the researcher name to appear in the
    // leader string. Order-insensitive; tolerates first/last swaps.
    return tokens.every((t) => v.includes(t));
  });
  const ledMonths = totalDistinctMonths(led);
  const externalCount = led.filter(
    (p) => !!p.funder && !/^aris$|\baris\b/i.test(p.funder.trim()),
  ).length;
  return {
    led,
    ledCount: led.length,
    ledMonthsTotal: ledMonths,
    ledYears: Math.round((ledMonths / 12) * 10) / 10,
    ledExternalCount: externalCount,
    sourceUrl: PROJECTS_URL,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Internals
// ──────────────────────────────────────────────────────────────────────────

const PROJECT_TYPES: IerProjectType[] = [
  'domaci-javni',
  'domaci-trzni',
  'tuji-javni',
  'tuji-trzni',
];

/** Pure parser for the project list HTML – exported for tests. */
export function parseIerProjects(html: string): IerProject[] {
  const out: IerProject[] = [];
  // Article blocks carry the tip_projekta-{type} class and contain a slug link.
  const articleRe = /<article[^>]*class="([^"]*)"[^>]*>([\s\S]*?)<\/article>/g;
  for (const m of html.matchAll(articleRe)) {
    const classes = m[1];
    const inner = m[2];

    const projectType =
      PROJECT_TYPES.find((t) => classes.includes(`tip_projekta-${t}`)) ?? 'unknown';

    const titleMatch = inner.match(
      /<a[^>]*href="https:\/\/www\.ier\.si\/projekti\/([^"\/]+)\/?"[^>]*>([^<]+)<\/a>/,
    );
    if (!titleMatch) continue;
    const slug = titleMatch[1];
    const title = decodeHtml(titleMatch[2]).trim();
    const url = `https://www.ier.si/projekti/${slug}/`;

    const funder = customField(inner, 'Naročnik');
    const code = customField(inner, 'Šifra projeka') ?? customField(inner, 'Šifra projekta');
    const durationRaw = customField(inner, 'Trajanje');
    const leader = customField(inner, 'Vodja projekta');

    const { start, end } = parseDuration(durationRaw);

    out.push({
      slug,
      url,
      title,
      funder: funder ?? undefined,
      code: code ?? undefined,
      durationRaw: durationRaw ?? undefined,
      startDate: start,
      endDate: end,
      leader: leader ?? undefined,
      projectType,
    });
  }
  return out;
}

/** Pull a custom-field value by its label, e.g. "Naročnik" or "Vodja projekta". */
function customField(html: string, label: string): string | null {
  const escaped = label.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  const re = new RegExp(
    `<span\\s+class="wpr-grid-extra-text-left">\\s*${escaped}\\s*:?\\s*<\\/span>` +
      `\\s*<span>([^<]*)<\\/span>`,
    'i',
  );
  const m = html.match(re);
  if (!m) return null;
  return decodeHtml(m[1]).trim();
}

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.4375;

/** Parse the Slovenian duration string. Accepts formats:
 *    "1. 11. 2025 do 19. 2. 2026"
 *    "1. 9. 2025 do 30. 11. 2027"
 *  Returns ISO yyyy-mm-dd for start and end when both parse. */
function parseDuration(raw: string | null | undefined): {
  start?: string;
  end?: string;
} {
  if (!raw) return {};
  const parts = raw.split(/\s+do\s+/i);
  if (parts.length !== 2) return {};
  return { start: parseSloDate(parts[0]), end: parseSloDate(parts[1]) };
}

function parseSloDate(s: string): string | undefined {
  const m = s.trim().match(/^(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})$/);
  if (!m) return undefined;
  const dd = m[1].padStart(2, '0');
  const mm = m[2].padStart(2, '0');
  const yyyy = m[3];
  return `${yyyy}-${mm}-${dd}`;
}

/** Sum the months covered by the union of the given projects' [start,end]
 *  intervals. Overlapping intervals are merged so simultaneous leadership
 *  doesn't double-count toward "years in a leadership function". */
function totalDistinctMonths(projects: IerProject[]): number {
  const intervals: Array<[number, number]> = [];
  for (const p of projects) {
    if (!p.startDate || !p.endDate) continue;
    const start = Date.parse(p.startDate);
    const end = Date.parse(p.endDate);
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) continue;
    intervals.push([start, end]);
  }
  if (intervals.length === 0) return 0;
  intervals.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [intervals[0]];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    const [s, e] = intervals[i];
    if (s <= last[1]) last[1] = Math.max(last[1], e);
    else merged.push([s, e]);
  }
  const ms = merged.reduce((acc, [s, e]) => acc + (e - s), 0);
  return Math.round(ms / MONTH_MS);
}

function normaliseName(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/,\s*(mag|dr|prof|univ)\.[\s.]*$/i, '')
    .replace(/^(?:(?:dr|mag|prof|univ)\.\s*)+/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function nameTokens(s: string): string[] {
  return s
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}]/gu, ''))
    .filter((t) => t.length > 1);
}

/** Decode HTML entities found in WP-rendered project titles. Handles named
 *  entities + numeric &#NN; + hex &#xNN; codes – the IER site emits numeric
 *  forms like &#8211; for en-dash. */
function decodeHtml(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&hellip;/g, '…')
    .replace(/&laquo;/g, '«')
    .replace(/&raquo;/g, '»');
}

function safeCodePoint(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff) return '';
  try {
    return String.fromCodePoint(n);
  } catch {
    return '';
  }
}
