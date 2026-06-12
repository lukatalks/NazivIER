// Build a copy-pasteable markdown summary of a researcher's evaluation.
//
// Use case: researcher fills out NazivIER, clicks »Copy summary«, pastes the
// result into an email to Kaja / the commission. The format mirrors the
// on-screen breakdown but in a portable text shape that survives email and
// works as a quick PDF source via pandoc if needed.

import { APP_VERSION, ALGO_VERSION } from '@/lib/version';
import { computeLiveOpenScience } from '@/lib/scoring/openScience';

import type { Researcher } from '@/lib/types';
import type { TitleEvaluation } from '@/lib/scoring/evaluate';

function fmt(n: number, d = 2): string {
  return n.toLocaleString('sl-SI', {
    minimumFractionDigits: d,
    maximumFractionDigits: d,
  });
}

function fmtEur(n: number | undefined | null): string {
  if (n == null) return '/';
  return new Intl.NumberFormat('sl-SI', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

const VERDICT = (eligible: boolean) => (eligible ? '✓ IZVOLLJIV' : '✗ ni izvolljiv');

const STAGE_ORDER: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4 };

/** Build a markdown report covering all metadata + every title evaluation. */
export function buildMarkdownSummary(
  researcher: Researcher,
  evaluations: TitleEvaluation[],
  generatedAt: Date,
): string {
  const lines: string[] = [];
  lines.push(`# NazivIER izračun – ${researcher.fullName}`);
  lines.push('');
  lines.push(
    `_Generirano: ${generatedAt.toLocaleString('sl-SI')} · ` +
      `Različica orodja: v${APP_VERSION} · ` +
      `Različica algoritma (pravilnika): ${ALGO_VERSION}_`,
  );
  lines.push('');
  lines.push(`SICRIS ID: **${researcher.sicrisId}**`);
  if (researcher.fetchedAt) {
    lines.push(
      `Bibliografski podatki pridobljeni: ${new Date(researcher.fetchedAt).toLocaleString('sl-SI')}`,
    );
  }
  lines.push('');

  // ─── Metadata block ─────────────────────────────────────────────────
  lines.push('## Vneseni podatki');
  lines.push('');
  lines.push(`- Raven izobrazbe (SOK): **${researcher.educationLevel ?? '–'}**`);
  lines.push(`- Let v raziskovalnem sektorju: **${researcher.yearsInResearchSector ?? '–'}**`);
  lines.push(
    `- Vrednost projektov izven ARIS, vodja (Pogoj 2): **${fmtEur(researcher.externalProjectsValueEur)}**`,
  );
  lines.push(
    `- Kumulativna vrednost vodenih projektov (Pogoj 3, a-d): **${fmtEur(researcher.leadership?.cumulativeValueEur)}**`,
  );
  lines.push(
    `- Leta vodilne funkcije (Pogoj 3, e): **${researcher.leadership?.leadershipYears ?? '–'}**`,
  );
  if (researcher.extraAchievements) {
    const ex = researcher.extraAchievements;
    lines.push(
      `- Dodatni dosežki (utež 1,0 / 0,5 / 0,3): **${ex.weight10Count} / ${ex.weight05Count} / ${ex.weight03Count}**`,
    );
  }
  if (researcher.isReelection) {
    lines.push(`- Ponovna izvolitev: **DA** (pragovi razpolovljeni po 22. členu)`);
  }
  if (typeof researcher.additionalDepositsPlanned === 'number') {
    lines.push(
      `- Dodatno deklarirana deponiranja za 11(6): **${researcher.additionalDepositsPlanned}**`,
    );
  }
  lines.push('');

  // Citation snapshot.
  lines.push('## Citati (čisti)');
  lines.push('');
  const c = researcher.citations;
  lines.push(`- SICRIS WoS: **${c.sicrisWosCleanCitations ?? c.wosCleanCitations ?? '–'}**`);
  if (typeof c.sicrisScopusCleanCitations === 'number') {
    lines.push(`- SICRIS Scopus: ${c.sicrisScopusCleanCitations}`);
  }
  if (typeof c.sicrisHIndexWos === 'number' && c.sicrisHIndexWos > 0) {
    lines.push(`- h-indeks (WoS): ${c.sicrisHIndexWos}`);
  }
  lines.push(`- Število publikacij iz SICRIS-a: ${researcher.publications.length}`);
  lines.push('');

  // ─── Open Science (Article 11(6)) ───────────────────────────────────
  // Mirrors the live on-screen ratio: post-2024 scientific publications only,
  // honouring per-publication OA overrides. Previously absent from the export
  // entirely (Tjaša Bartolj review, 2026-06-10).
  const oa = computeLiveOpenScience(researcher);
  lines.push('## Odprti dostop (11. člen, 6. odstavek)');
  lines.push('');
  if (!oa.hasData) {
    lines.push(
      '- Ni znanstvenih objav po letu 2024, ki bi bile predmet pogoja odprtega dostopa.',
    );
  } else {
    lines.push(`- Znanstvene objave po 2024 (predmet 11(6)): **${oa.total}**`);
    lines.push(`- V odprtem dostopu: **${oa.openCount}**`);
    if (oa.restrictedCount > 0) {
      lines.push(
        `- Z dokumentirano založniško omejitvijo (izjema): **${oa.restrictedCount}**`,
      );
    }
    lines.push(`- Brez odprtega dostopa: **${oa.closedCount}**`);
    lines.push(
      `- Delež izpolnjevanja: **${Math.round(oa.ratio * 100)} %**` +
        (oa.fullyCompliant ? ' (izpolnjeno)' : ''),
    );
  }
  lines.push('');
  lines.push(
    '_Pogoj velja le za znanstvene objave, ki so predmet presoje ' +
      '(1.01, 1.02, 1.03, 1.06, 1.08, 1.16, 1.26), nastale po uveljavitvi ' +
      'Uredbe 59/23 (od leta 2024). Intervjuji, recenzije, strokovni in ' +
      'poljudni prispevki niso vključeni._',
  );
  lines.push('');

  // ─── Per-title verdict, grouped ─────────────────────────────────────
  // Filter to the meaningful "sodelavec"-and-above tier; group by stage label.
  const evaluated = [...evaluations].filter((e) =>
    [
      'znanstveni-sodelavec',
      'visji-znanstveni-sodelavec',
      'znanstveni-svetnik',
      'strokovno-raziskovalni-sodelavec',
      'visji-strokovno-raziskovalni-sodelavec',
      'strokovno-raziskovalni-svetnik',
      'razvojni-sodelavec',
      'visji-razvojni-sodelavec',
      'razvojni-svetnik',
    ].includes(e.title),
  );
  evaluated.sort((a, b) => {
    const sa = STAGE_ORDER[a.stage] ?? 99;
    const sb = STAGE_ORDER[b.stage] ?? 99;
    if (sa !== sb) return sa - sb;
    return a.groupLabel.localeCompare(b.groupLabel);
  });

  lines.push('## Pregled po nazivih');
  lines.push('');
  for (const ev of evaluated) {
    lines.push(`### ${ev.groupLabel} (stopnja ${ev.stage}) — ${VERDICT(ev.eligible)}`);
    lines.push('');
    lines.push(
      `- Standardov izpolnjenih: **${ev.standardsMet}** od potrebnih **${ev.standardsRequired}**`,
    );
    lines.push(`- Skupaj ekvivalentov (Pogoj 1): **${fmt(ev.totalEquivalents)}**`);
    lines.push(`- Citati (${ev.citationSource}): ${ev.citationsUsed}`);
    lines.push('');
    for (const std of ev.standards) {
      const mark = std.passed ? '✓' : '✗';
      lines.push(`**${mark} ${std.name} — ${std.description}**`);
      lines.push('');
      lines.push(`> ${std.evidence}`);
      lines.push('');
    }
    if (ev.eligibleWithoutPogoj1) {
      lines.push(
        '> ⚠ Izvolljiv kljub neizpolnjenemu Pogoju 1 (objavljeni dosežki) – ' +
          'pravilnik dopušča izpolnitev 2 od 3 pogojev.',
      );
      lines.push('');
    }
    if (ev.reliesOnSelfReportedInputs) {
      lines.push(
        '> ⚠ Izvolljivost se opira na ročno vnesene, nepreverjene vrednosti ' +
          '(Pogoj 2: vrednost projektov izven ARIS; Pogoj 3: vrednost ali leta vodenja).',
      );
      lines.push('');
    }
    if (ev.blockingReasons.length > 0) {
      lines.push(`**Razlogi neizvolljivosti:**`);
      for (const r of ev.blockingReasons) lines.push(`- ${r}`);
      lines.push('');
    }
    if (ev.earlyPromotionEligible) {
      lines.push(`*${ev.earlyPromotionEvidence}*`);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  }

  // ─── Top contributing publications ──────────────────────────────────
  // Take the highest-tier evaluation for context and pull its contributions.
  const top = evaluated.find((e) => e.contributions.length > 0);
  if (top) {
    lines.push('## Top 25 publikacij po ekvivalentu');
    lines.push('');
    lines.push('| Leto | Tip. | Naslov | Utež | Avt. | Ekv. |');
    lines.push('|---|---|---|---|---|---|');
    for (const c of top.contributions.slice(0, 25)) {
      const title = c.publication.title.replace(/\|/g, '\\|').slice(0, 80);
      lines.push(
        `| ${c.publication.year} | ${c.publication.typology} | ${title} | ${c.weight} | ${c.authorshipFactor} | ${fmt(c.equivalent)} |`,
      );
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(
    `_Generirano avtomatsko z orodjem NazivIER (nazivier.vercel.app). ` +
      `Algoritem sledi Pravilniku IER (predlog 05. 6. 2026, v2.2), Prilogi 2 in 3. ` +
      `Faktor avtorstva je za vsako publikacijo ročno potrjen, ` +
      `EUR vrednosti so vnesene s strani raziskovalca. ` +
      `Pravilniško razsodbo poda komisija; ta dokument je tehnična podlaga._`,
  );
  return lines.join('\n');
}
