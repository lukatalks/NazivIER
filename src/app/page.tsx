'use client';

import { useMemo, useState } from 'react';

import { EvaluationCard } from '@/components/EvaluationCard';
import { MetadataPanel } from '@/components/MetadataPanel';
import { ResearcherPicker } from '@/components/ResearcherPicker';
import { evaluateAll, highestEligible, type TitleEvaluation } from '@/lib/scoring/evaluate';
import type { CitationData, Publication, Researcher } from '@/lib/types';

interface ResearcherResponse {
  sicrisId: string;
  publications: Publication[];
  citations: CitationData;
  evalMarkers: { aDoublePrime: number; aPrime: number; a12: number };
  fetchedAt: string;
}

export default function Home() {
  const [researcher, setResearcher] = useState<Researcher | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(sicrisId: string, label: string) {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/researcher?id=${encodeURIComponent(sicrisId)}`);
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      const data = (await r.json()) as ResearcherResponse;
      setResearcher({
        sicrisId: data.sicrisId,
        fullName: label,
        publications: data.publications,
        citations: data.citations,
        fetchedAt: data.fetchedAt,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function patchResearcher(patch: Partial<Researcher>) {
    setResearcher((cur) => (cur ? { ...cur, ...patch } : cur));
  }

  const evaluations = useMemo<TitleEvaluation[]>(
    () => (researcher ? evaluateAll(researcher) : []),
    [researcher],
  );
  const highest = useMemo(() => highestEligible(evaluations), [evaluations]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-[var(--border)] bg-white dark:bg-black/30">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
            Inštitut za ekonomska raziskovanja · interno orodje
          </p>
          <h1 className="mt-1 text-2xl font-semibold">
            NazivIER — kalkulator raziskovalnih nazivov
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[var(--muted)]">
            Avtomatski izračun izpolnjevanja pogojev po novem{' '}
            <em>Pravilniku o raziskovalnih nazivih</em> (predlog 26. 5. 2026), Priloge 2 in 3. Vir
            podatkov: SICRIS / COBISS, javno dostopne bibliografije in citatne baze WoS in Scopus.
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8 space-y-8">
        <ResearcherPicker onPick={load} loading={loading} />

        {loading ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-6 text-sm">
            Pridobivamo bibliografijo iz SICRIS-a in računamo … (lahko traja nekaj sekund prvič,
            nato je predpomnjeno).
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-bg)] p-4 text-sm">
            <strong className="font-semibold">Napaka pri pridobivanju podatkov:</strong> {error}
          </div>
        ) : null}

        {researcher ? (
          <>
            <SummaryStrip researcher={researcher} highest={highest} />
            <MetadataPanel researcher={researcher} onChange={patchResearcher} />
            <section>
              <h2 className="mb-3 text-lg font-semibold">Razčlenitev po nazivih</h2>
              <div className="grid gap-4">
                {evaluations.map((e) => (
                  <EvaluationCard
                    key={e.title}
                    evaluation={e}
                    defaultExpanded={e.eligible}
                  />
                ))}
              </div>
            </section>
            <Methodology />
          </>
        ) : null}
      </main>

      <footer className="border-t border-[var(--border)] bg-white dark:bg-black/30">
        <div className="mx-auto max-w-6xl px-6 py-4 text-xs text-[var(--muted)]">
          Metodologija po pravilniku z dne 26. 5. 2026, Priloga 3. Tipologija po Cobiss tipologiji
          dokumentov/del. Citati po čistih citatih iz Web of Science (alternativno Scopus). Faktor
          avtorstva: po SICRIS-u privzeto 0,7 (enakovredno avtorstvo) — ročno popraviti za prvega /
          korespondenčnega.
        </div>
      </footer>
    </div>
  );
}

function SummaryStrip({
  researcher,
  highest,
}: {
  researcher: Researcher;
  highest: ReturnType<typeof highestEligible>;
}) {
  const groups: Array<['znanstveni' | 'strokovno-raziskovalni' | 'razvojni', string]> = [
    ['znanstveni', 'Znanstveni'],
    ['strokovno-raziskovalni', 'Strokovno-raziskovalni'],
    ['razvojni', 'Razvojni'],
  ];

  return (
    <section className="rounded-lg border border-[var(--border)] bg-white dark:bg-black/20 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{researcher.fullName}</h2>
        <span className="text-xs text-[var(--muted)] tabnum">
          SICRIS #{researcher.sicrisId} · pridobljeno{' '}
          {researcher.fetchedAt
            ? new Date(researcher.fetchedAt).toLocaleString('sl-SI')
            : '–'}
        </span>
      </div>
      <p className="text-sm text-[var(--muted)]">
        Publikacij iz SICRIS: <strong>{researcher.publications.length}</strong> · čisti citati WoS:{' '}
        <strong className="tabnum">{researcher.citations.wosCleanCitations}</strong>
        {researcher.citations.scopusCleanCitations != null ? (
          <>
            {' '}· Scopus:{' '}
            <strong className="tabnum">{researcher.citations.scopusCleanCitations}</strong>
          </>
        ) : null}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {groups.map(([key, label]) => {
          const top = highest[key];
          return (
            <div
              key={key}
              className="rounded-md border p-3"
              style={{
                borderColor: top ? 'var(--success)' : 'var(--border)',
                background: top ? 'var(--success-bg)' : 'var(--muted-bg)',
              }}
            >
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
                {label}
              </div>
              <div className="mt-1 text-base font-semibold">
                {top ? top.groupLabel : '— ne dosega praga sodelavca —'}
              </div>
              {top ? (
                <div className="text-xs text-[var(--muted)]">
                  Stopnja {top.stage}. · {top.standardsMet}/{top.standardsRequired} standardov ·
                  ekv.: {top.totalEquivalents.toLocaleString('sl-SI', { maximumFractionDigits: 2 })}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function Methodology() {
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-5 text-sm leading-relaxed">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        Metodologija
      </h2>
      <ul className="mt-2 ml-5 list-disc space-y-1">
        <li>
          <strong>Ekvivalent dosežka</strong> = utež dosežka × faktor avtorstva (Pravilnik, Priloga
          3, Pojasnila k merilom).
        </li>
        <li>
          <strong>Uteži</strong> sledijo tabeli v Prilogi 3: 1,0 za Q1/Q2 članke (1A1/1A2 v
          COBISS), monografije, patente; 0,7 za druge znanstvene članke; 0,5 za vabljene povzetke
          in strokovne monografije; 0,3 za strokovne članke in elaborate; 0,1 za poljudne
          prispevke.
        </li>
        <li>
          <strong>Q1/Q2 status</strong> je določen heuristično — prvi N publikacij tipa 1.01/1.02
          glede na število A1/2 v SICRIS Vrednotenju je označen kot Q1/Q2. Za zanesljiv izračun je
          treba potrditi ročno.
        </li>
        <li>
          <strong>Faktor avtorstva</strong>: SICRIS bibliografska zbirka ne razkrije
          korespondenčnega avtorja, zato je privzeto 0,7 (enakovredno avtorstvo). Za izvolitveni
          postopek je treba potrditi prvega / korespondenčnega avtorja ročno (utež 1,0).
        </li>
        <li>
          <strong>Citati</strong>: štejejo čisti citati (brez avtocitatov) iz WoS, alternativno
          Scopus, neposredno iz SICRIS-a.
        </li>
        <li>
          <strong>Vodenje projektov</strong> (Pogoj 3) ni samodejno izračunano — vnos je ročen po
          opredelitvah ARIS o kategoriji A FTE.
        </li>
      </ul>
    </section>
  );
}
