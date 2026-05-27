'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import { EvaluationCard } from '@/components/EvaluationCard';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { MetadataPanel } from '@/components/MetadataPanel';
import { ResearcherPicker } from '@/components/ResearcherPicker';
import { StructuredData } from '@/components/StructuredData';
import type { Locale } from '@/i18n/config';
import { evaluateAll, highestEligible, type TitleEvaluation } from '@/lib/scoring/evaluate';
import type { CitationData, Publication, Researcher } from '@/lib/types';

interface OpenAlexInfo {
  openalexId: string;
  displayName: string;
  orcid?: string;
  citedByCount: number;
  hIndex: number;
  worksCount: number;
  matchType: 'orcid' | 'ier-match' | 'best-name' | 'none';
}

interface ResearcherResponse {
  sicrisId: string;
  profile: { sicrisId: string; fullName: string; titlePrefix?: string };
  publications: Publication[];
  citations: CitationData;
  openAlex?: OpenAlexInfo;
  fetchedAt: string;
}

interface FullResearcher extends Researcher {
  openAlex?: OpenAlexInfo;
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
] as const;

export function TitleCalculator({ locale }: Props) {
  const t = useTranslations();
  const [researcher, setResearcher] = useState<FullResearcher | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load(sicrisId: string, fallbackLabel: string) {
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
        fullName: data.profile?.fullName ?? fallbackLabel,
        publications: data.publications,
        citations: data.citations,
        fetchedAt: data.fetchedAt,
        openAlex: data.openAlex,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  function patchResearcher(patch: Partial<FullResearcher>) {
    setResearcher((cur) => (cur ? { ...cur, ...patch } : cur));
  }

  const evaluations = useMemo<TitleEvaluation[]>(
    () => (researcher ? evaluateAll(researcher) : []),
    [researcher],
  );
  const highest = useMemo(() => highestEligible(evaluations), [evaluations]);

  return (
    <div className="flex flex-1 flex-col">
      <StructuredData locale={locale} />

      <header className="border-b border-[var(--border)] bg-white dark:bg-black/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-5 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--accent)]">
                {t('header.eyebrow')}
              </p>
              <h1 className="mt-1 text-xl sm:text-2xl font-semibold">{t('header.title')}</h1>
            </div>
            <LanguageSwitcher locale={locale} />
          </div>
          <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
            {t('header.subtitle1')}
            <em>{t('header.subtitleEm')}</em>
            {t('header.subtitle2')}
          </p>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        <ResearcherPicker onPick={load} loading={loading} />

        {loading ? (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-5 text-sm">
            {t('loading')}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-lg border border-[var(--danger)] bg-[var(--danger-bg)] p-4 text-sm">
            <strong className="font-semibold">{t('error.label')}</strong> {error}
          </div>
        ) : null}

        {researcher ? (
          <>
            <SummaryStrip researcher={researcher} highest={highest} locale={locale} />
            <MetadataPanel researcher={researcher} onChange={patchResearcher} />
            <section>
              <h2 className="mb-3 text-lg font-semibold">{t('breakdownTitle')}</h2>
              <div className="grid gap-4">
                {evaluations.map((e) => (
                  <EvaluationCard key={e.title} evaluation={e} defaultExpanded={e.eligible} />
                ))}
              </div>
            </section>
            <Methodology />
          </>
        ) : null}
      </main>

      <footer className="border-t border-[var(--border)] bg-white dark:bg-black/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-4 text-xs text-[var(--muted)]">
          {t('footer')}
        </div>
      </footer>
    </div>
  );
}

function SummaryStrip({
  researcher,
  highest,
  locale,
}: {
  researcher: FullResearcher;
  highest: ReturnType<typeof highestEligible>;
  locale: Locale;
}) {
  const t = useTranslations('summary');
  const groups = ['znanstveni', 'strokovno-raziskovalni', 'razvojni'] as const;
  const dateLocale = locale === 'sl' ? 'sl-SI' : 'en-GB';

  return (
    <section className="rounded-lg border border-[var(--border)] bg-white dark:bg-black/20 p-4 sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold">{researcher.fullName}</h2>
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
        {t('publicationsFromSicris')}: <strong>{researcher.publications.length}</strong> ·{' '}
        {t('citationsOpenAlex')}:{' '}
        <strong className="tabnum">{researcher.citations.wosCleanCitations}</strong>
        {researcher.openAlex ? (
          <>
            {' '}· {t('hIndex')}: <strong className="tabnum">{researcher.openAlex.hIndex}</strong>{' '}
            <span className="text-xs">
              ({t(`matchType.${researcher.openAlex.matchType}` as 'matchType.orcid')})
            </span>
          </>
        ) : (
          <>
            {' '}· <span className="text-[var(--warn)]">{t('openAlexNotFound')}</span>
          </>
        )}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {groups.map((key) => {
          const top = highest[key];
          const eq = top
            ? top.totalEquivalents.toLocaleString(dateLocale, { maximumFractionDigits: 2 })
            : '';
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
                {t(`groups.${key}` as 'groups.znanstveni')}
              </div>
              <div className="mt-1 text-base font-semibold">
                {top ? top.groupLabel : t('notEligible')}
              </div>
              {top ? (
                <div className="text-xs text-[var(--muted)]">
                  {t('stageStandards', {
                    stage: top.stage,
                    met: top.standardsMet,
                    required: top.standardsRequired,
                    eq,
                  })}
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
