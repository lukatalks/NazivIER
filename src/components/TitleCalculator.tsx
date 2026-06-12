'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

import { DiagnosticsBlock, VersionFooter } from '@/components/Diagnostics';
import { DuplicatesStrip } from '@/components/DuplicatesStrip';
import { ExportToolbar } from '@/components/ExportToolbar';
import { GroupedBreakdown } from '@/components/GroupedBreakdown';
import {
  KajaCalibrationPanel,
  KajaUnlockButton,
} from '@/components/KajaCalibrationPanel';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { MetadataPanel } from '@/components/MetadataPanel';
import { ResearcherPicker } from '@/components/ResearcherPicker';
import { StructuredData } from '@/components/StructuredData';
import type { Locale } from '@/i18n/config';
import {
  applyPersistedInputs,
  extractPersistableInputs,
  loadPersistedInputs,
  savePersistedBlob,
  savePersistedInputs,
} from '@/lib/persistence/researcherStorage';
import {
  fetchServerInputs,
  getEditorName,
  pushServerInputs,
} from '@/lib/persistence/serverInputsClient';
import { evaluateAll, type TitleEvaluation } from '@/lib/scoring/evaluate';
import { computeLiveOpenScience } from '@/lib/scoring/openScience';
import type {
  CitationData,
  EducationLevel,
  IerProjectLeadershipSummary,
  OpenScienceCompliance,
  Publication,
  Researcher,
} from '@/lib/types';

interface OpenAlexInfo {
  openalexId: string;
  displayName: string;
  orcid?: string;
  citedByCount: number;
  hIndex: number;
  worksCount: number;
  matchType: 'orcid' | 'ier-match' | 'best-name' | 'none';
}

interface CitationDiagnostics {
  rawTotal: number;
  selfExcluded: number;
  clean: number;
  method:
    | 'openalex-self-excluded'
    | 'openalex-raw'
    | 'sicris-wos'
    | 'sicris-wos+openalex';
  sicrisFetched?: boolean;
}

interface ResearcherResponse {
  sicrisId: string;
  profile: { sicrisId: string; fullName: string; titlePrefix?: string };
  publications: Publication[];
  citations: CitationData;
  openAlex?: OpenAlexInfo;
  openScienceCompliance?: OpenScienceCompliance;
  inferredEducationLevel?: EducationLevel;
  citationDiagnostics?: CitationDiagnostics;
  ierProjectLeadership?: IerProjectLeadershipSummary;
  bibliographyUnavailable?: boolean;
  fetchedAt: string;
}

interface FullResearcher extends Researcher {
  openAlex?: OpenAlexInfo;
  citationDiagnostics?: CitationDiagnostics;
  bibliographyUnavailable?: boolean;
}

interface Props {
  locale: Locale;
}

const METHODOLOGY_KEYS = [
  'equivalent',
  'weights',
  'q12',
  'authorship',
  'citations',
  'leadership',
  'openScience',
  'earlyPromotion',
  'reelection',
] as const;

export function TitleCalculator({ locale }: Props) {
  const t = useTranslations();
  const [researcher, setResearcher] = useState<FullResearcher | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSicrisId, setLastSicrisId] = useState<string | null>(null);
  // Who last saved the shared (server) record for the current researcher, for
  // transparency in the toolbar. Null when there's no shared record yet.
  const [sharedMeta, setSharedMeta] = useState<{
    lastEditedBy?: string;
    savedAt?: string;
  } | null>(null);

  async function load(sicrisId: string, fallbackLabel: string) {
    setLoading(true);
    setError(null);
    setLastSicrisId(sicrisId);
    // Hard client-side timeout so a dead/slow mobile connection surfaces an
    // error + retry path instead of an indefinite spinner (reported 2026-06-12,
    // weak mobile signal). 45 s comfortably clears even Verbič's 545-pub fetch.
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 45000);
    try {
      // The bibliography fetch is slow (COBISS); the shared-inputs read is a
      // tiny Redis GET — run them together so hydration adds no latency.
      const [r, serverBlob] = await Promise.all([
        fetch(`/api/researcher?id=${encodeURIComponent(sicrisId)}`, {
          signal: ctrl.signal,
        }),
        fetchServerInputs(sicrisId, ctrl.signal),
      ]);
      if (!r.ok) {
        const body = (await r.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      const data = (await r.json()) as ResearcherResponse;
      const fresh: FullResearcher = {
        sicrisId: data.sicrisId,
        fullName: data.profile?.fullName ?? fallbackLabel,
        publications: data.publications,
        citations: data.citations,
        // Preselect the SOK dropdown when the name parser detected dr./mag.
        // so the eligibility check is not blocked by an unset education field.
        educationLevel: data.inferredEducationLevel,
        inferredEducationLevel: data.inferredEducationLevel,
        fetchedAt: data.fetchedAt,
        openAlex: data.openAlex,
        openScienceCompliance: data.openScienceCompliance,
        citationDiagnostics: data.citationDiagnostics,
        ierProjectLeadership: data.ierProjectLeadership,
        bibliographyUnavailable: data.bibliographyUnavailable,
      };
      // Re-apply persisted manual inputs for this SICRIS ID. Fresh fetch always
      // wins for bibliography/citations; the persisted blob only overlays scalar
      // fields (EUR amounts, years, education override) and per-publication
      // authorship + OA overrides keyed by publication.id.
      //
      // v3.1: the shared server store is the source of truth so everyone —
      // including Kaja's calibration panel — sees the same realistic state.
      // The localStorage cache is a fallback that migrates up the first time we
      // find the server empty (e.g. inputs entered before this feature shipped).
      const localBlob = loadPersistedInputs(data.sicrisId);
      if (serverBlob) {
        setResearcher(applyPersistedInputs(fresh, serverBlob));
        savePersistedBlob(serverBlob);
        setSharedMeta({
          lastEditedBy: serverBlob.lastEditedBy,
          savedAt: serverBlob.savedAt,
        });
      } else if (localBlob) {
        setResearcher(applyPersistedInputs(fresh, localBlob));
        void pushServerInputs(localBlob.sicrisId, localBlob, getEditorName());
        setSharedMeta({
          lastEditedBy: localBlob.lastEditedBy,
          savedAt: localBlob.savedAt,
        });
      } else {
        setResearcher(fresh);
        setSharedMeta(null);
      }
    } catch (e) {
      const aborted = e instanceof Error && e.name === 'AbortError';
      setError(
        aborted
          ? 'Časovna omejitev (45 s) presežena – poskusite znova. · Request timed out (45 s) – please retry.'
          : e instanceof Error
            ? e.message
            : String(e),
      );
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  // Debounce persistence writes so a slider drag or fast typing doesn't hammer
  // localStorage. 350 ms feels instant to the user but coalesces bursts.
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!researcher) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const inputs = extractPersistableInputs(researcher);
      // Dual-write: localStorage (instant, offline-safe) + shared server store
      // (so Kaja and colleagues see the same realistic state).
      savePersistedInputs(researcher.sicrisId, inputs);
      const editor = getEditorName();
      void pushServerInputs(researcher.sicrisId, inputs, editor);
      setSharedMeta({
        lastEditedBy: editor.trim() || undefined,
        savedAt: new Date().toISOString(),
      });
    }, 350);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [researcher]);

  function patchResearcher(patch: Partial<FullResearcher>) {
    setResearcher((cur) => (cur ? { ...cur, ...patch } : cur));
  }

  const evaluations = useMemo<TitleEvaluation[]>(
    () => (researcher ? evaluateAll(researcher) : []),
    [researcher],
  );

  // Bring the results (verdict cards) into view the moment a researcher
  // finishes loading. The picker sits at the top; without this the user landed
  // on the config panel and "saw no numbers" (reported 2026-06-12). Guarded so
  // it fires once per loaded researcher — never on input edits.
  const resultsRef = useRef<HTMLDivElement>(null);
  const scrolledForId = useRef<string | null>(null);
  useEffect(() => {
    if (!researcher || researcher.bibliographyUnavailable || loading) return;
    if (scrolledForId.current === researcher.sicrisId) return;
    scrolledForId.current = researcher.sicrisId;
    // Defer one frame so the freshly mounted results subtree is laid out, then
    // jump instantly. Programmatic `behavior:'smooth'` scrolls are silently
    // dropped outside a user gesture (verified live 2026-06-12 — smooth left
    // scrollY at 0, 'auto' scrolled correctly). scroll-mt-4 keeps a top gap.
    const raf = requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [researcher?.sicrisId, loading]);

  return (
    <div className="flex flex-1 flex-col">
      <StructuredData locale={locale} />

      <header className="border-b border-[var(--border)] bg-white dark:bg-black/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <a
              href="https://www.ier.si"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Inštitut za ekonomska raziskovanja"
              className="shrink-0"
            >
              {/* Same source-of-truth as the impact-measurement tool: vertical
                  IER lockup on light surfaces, horizontal banner on dark. The
                  CSS toggles via dark: variant. */}
              <Image
                src="/brand/ier/ier-logo.png"
                alt="Inštitut za ekonomska raziskovanja / Institute for Economic Research"
                width={224}
                height={97}
                priority
                className="block dark:hidden h-12 w-auto"
              />
              <Image
                src="/brand/ier/ier-logo-dark.png"
                alt="Inštitut za ekonomska raziskovanja / Institute for Economic Research"
                width={533}
                height={94}
                priority
                className="hidden dark:block h-12 w-auto"
              />
            </a>
            <LanguageSwitcher locale={locale} />
          </div>
          <div className="mt-4 sm:mt-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
              {t('header.eyebrow')}
            </p>
            <h1 className="mt-1 text-xl sm:text-2xl font-semibold">{t('header.title')}</h1>
            <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
              {t('header.subtitle1')}
              <em>{t('header.subtitleEm')}</em>
              {t('header.subtitle2')}
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 overflow-x-hidden px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <ResearcherPicker
          onPick={load}
          loading={loading}
          loadedId={
            researcher && !researcher.bibliographyUnavailable
              ? researcher.sicrisId
              : null
          }
        />

        {loading ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-5 text-sm">
            {t('loading')}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-bg)] p-4 text-sm">
            <strong className="font-semibold">{t('error.label')}</strong> {error}
            <DiagnosticsBlock
              error={error}
              sicrisId={lastSicrisId}
              extra={{
                hasResearcher: !!researcher,
                cacheBackendHint: 'see /api/health',
              }}
            />
          </div>
        ) : null}

        {researcher && researcher.bibliographyUnavailable ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
            <p>
              <strong className="font-semibold">{t('bibUnavailable.label')}</strong>{' '}
              {t('bibUnavailable.body', { name: researcher.fullName })}
            </p>
            <button
              type="button"
              onClick={() => load(researcher.sicrisId, researcher.fullName)}
              disabled={loading}
              className="mt-3 inline-flex items-center rounded-md border border-amber-400 bg-white px-3 py-1.5 font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-600 dark:bg-transparent dark:text-amber-100 dark:hover:bg-amber-900/40"
            >
              {loading ? t('bibUnavailable.retrying') : t('bibUnavailable.retry')}
            </button>
          </div>
        ) : null}

        {researcher && !researcher.bibliographyUnavailable ? (
          // Results-first ordering (2026-06-12): the verdict cards
          // (GroupedBreakdown) now render directly under the headline strip,
          // ABOVE the large MetadataPanel config. Previously the config sat
          // first and the user "saw no numbers, only things to configure".
          // `key={researcher.sicrisId}` on the per-researcher subtrees forces
          // React to remount on a different pick so MetadataPanel/GroupedBreakdown
          // don't show stale toggles. scroll-mt-4 offsets the smooth scroll.
          <div ref={resultsRef} className="scroll-mt-4 space-y-6 sm:space-y-8">
            <SummaryStrip researcher={researcher} locale={locale} />
            <ExportToolbar
              key={`export-${researcher.sicrisId}`}
              researcher={researcher}
              evaluations={evaluations}
              onResearcherChange={setResearcher}
              sharedMeta={sharedMeta}
            />
            <OpenScienceDemoBanner evaluations={evaluations} />
            {/* THE NUMBERS — verdict cards first, so picking a researcher
                immediately shows pass/fail + equivalents. */}
            <GroupedBreakdown
              key={`breakdown-${researcher.sicrisId}`}
              evaluations={evaluations}
            />
            <KajaCalibrationPanel
              key={`kaja-${researcher.sicrisId}`}
              researcher={researcher}
              rulebookTotal={getRulebookTotal(evaluations)}
            />
            <DuplicatesStrip
              key={`dups-${researcher.sicrisId}`}
              publications={researcher.publications}
            />
            {/* Config below the results — refine authorship / EUR / education
                here, then the numbers above recompute live. */}
            <MetadataPanel
              key={`meta-${researcher.sicrisId}`}
              researcher={researcher}
              onChange={patchResearcher}
            />
            <Methodology />
          </div>
        ) : null}
      </main>

      <footer className="border-t border-[var(--border)] bg-white dark:bg-black/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 text-xs text-[var(--muted)]">
          {t('footer')}
          <VersionFooter />
        </div>
      </footer>
    </div>
  );
}

function SummaryStrip({
  researcher,
  locale,
}: {
  researcher: FullResearcher;
  locale: Locale;
}) {
  const t = useTranslations('summary');
  const dateLocale = locale === 'sl' ? 'sl-SI' : 'en-GB';
  // Live Article 11(6) ratio computed from the current publications + per-pub
  // overrides — NOT the immutable server snapshot, which never reacted to user
  // edits (Tjaša Bartolj bug, 2026-06-10). Recomputes when an OA radio changes.
  const liveOa = useMemo(
    () => computeLiveOpenScience(researcher),
    [researcher],
  );

  return (
    <section className="rounded-lg border border-[var(--border)] bg-white dark:bg-black/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="flex items-center text-lg font-semibold">
          <span>{researcher.fullName}</span>
          <KajaUnlockButton />
        </h2>
        <span className="text-xs text-[var(--muted)] tabnum">
          {t('fetchedAt', {
            id: researcher.sicrisId,
            date: researcher.fetchedAt
              ? new Date(researcher.fetchedAt).toLocaleString(dateLocale)
              : '–',
          })}
        </span>
      </div>
      <p className="text-sm text-[var(--muted)]">
        {t('publicationsFromSicris')}: <strong>{researcher.publications.length}</strong>
        {/* SICRIS WoS (rulebook-official) + OpenAlex (broader-coverage) shown
            side by side. SICRIS leads because that's what ARIS evaluators see;
            OpenAlex shows the broader-aggregate as a sanity check. */}
        {typeof researcher.citations.sicrisWosCleanCitations === 'number' ? (
          <>
            {' '}· {t('citationsSicrisWos')}:{' '}
            <strong className="tabnum">
              {researcher.citations.sicrisWosCleanCitations}
            </strong>
            {typeof researcher.citations.sicrisHIndexWos === 'number' &&
            researcher.citations.sicrisHIndexWos > 0 ? (
              <span className="text-xs">
                {' '}(h={researcher.citations.sicrisHIndexWos})
              </span>
            ) : null}
          </>
        ) : null}
        {/* v2.8: OpenAlex citation/h-index display removed from public UI per
            Kaja's 05.06.2026 request — »ni splošno uporabljen v pravilnikih«.
            OpenAlex remains used silently in the backend for Article 11(6)
            Open-Access detection only. SICRIS Scopus citations shown instead
            as the secondary signal next to WoS. */}
        {typeof researcher.citations.sicrisScopusCleanCitations === 'number' &&
        researcher.citations.sicrisScopusCleanCitations > 0 ? (
          <>
            {' '}· {t('citationsSicrisScopus')}:{' '}
            <strong className="tabnum">
              {researcher.citations.sicrisScopusCleanCitations}
            </strong>
            {typeof researcher.citations.sicrisHIndexScopus === 'number' &&
            researcher.citations.sicrisHIndexScopus > 0 ? (
              <span className="text-xs">
                {' '}(h={researcher.citations.sicrisHIndexScopus})
              </span>
            ) : null}
          </>
        ) : null}
        {liveOa.hasData ? (
          <>
            {' '}·{' '}
            <span
              className={
                liveOa.fullyCompliant
                  ? 'text-[var(--success)]'
                  : 'text-[var(--warn)]'
              }
            >
              {t('openScience', {
                ratio: Math.round(liveOa.ratio * 100),
                count: liveOa.total,
              })}
            </span>
          </>
        ) : null}
      </p>
      {/* Group cards moved to <GroupedBreakdown /> so they are interactive
          and expand to the per-title details on click (supervisor request
          2026-05-28). The SummaryStrip now stays minimal: name + headline
          metadata. */}
    </section>
  );
}

/** Banner shown when the Open-Science (11/6) check is currently in demo-pass
 *  mode. Always shows the real OA ratio so the researcher can plan ahead. */
function OpenScienceDemoBanner({ evaluations }: { evaluations: TitleEvaluation[] }) {
  const t = useTranslations('osDemo');
  if (evaluations.length === 0) return null;
  const ev = evaluations[0];
  if (!ev.openScienceDemoMode) return null;
  return (
    <div className="rounded-md border border-[var(--warn)] bg-[var(--warn-bg)] px-3 py-2 text-xs leading-relaxed">
      <strong className="font-semibold">{t('title')}</strong> {t('body')}
    </div>
  );
}

/** Pick the rulebook Σ to display next to the calibration Σ.
 *
 *  Heuristic: prefer the highest-stage eligible title in the znanstveni group;
 *  fall back to whichever evaluation has the maximum totalEquivalents. The
 *  number is the same Pogoj-1 figure shown inside that title's card – the
 *  panel just surfaces it once for direct side-by-side comparison. */
function getRulebookTotal(evaluations: TitleEvaluation[]): number {
  if (evaluations.length === 0) return 0;
  let best = 0;
  for (const e of evaluations) {
    if (e.totalEquivalents > best) best = e.totalEquivalents;
  }
  return best;
}

function Methodology() {
  const t = useTranslations('methodology');
  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-4 sm:p-5 text-sm leading-relaxed">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
        {t('title')}
      </h2>
      <ul className="mt-2 ml-5 list-disc space-y-1">
        {METHODOLOGY_KEYS.map((k) => (
          <li key={k}>
            <strong>{t(`items.${k}.head` as 'items.equivalent.head')}</strong>
            {t(`items.${k}.body` as 'items.equivalent.body')}
          </li>
        ))}
      </ul>
    </section>
  );
}
