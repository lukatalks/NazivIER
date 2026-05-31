'use client';

// Kaja simulation panel — password-gated reviewer dialogue tool (v2.7.4+).
//
// Why password-gated rather than open: this is a stakeholder calibration
// surface, not a candidate-facing feature. The lock keeps casual users from
// reading simulation results as »the real score«. The password (»KAJAZMAJA«) is
// friction not security – the value is the deliberate intent to interpret the
// alternative figure as a what-if exercise.
//
// What it does NOT do: it never changes rulebook pass/fail. The official
// evaluator (`evaluate.ts`) is the only source of eligibility truth. This panel
// shows a parallel simulation Σ and parallel per-title verdicts alongside the
// rulebook values, so the reviewer can stress-test every condition from the
// Pravilnik – authorship, awards, Q1/Q2, citations source, leadership,
// Open Science threshold, even the global threshold multiplier.
//
// Two exports: <KajaUnlockButton /> for inline mounting next to the researcher
// name, and <KajaCalibrationPanel /> for the full panel rendered below the
// summary. Both share state via sessionStorage + a window-level custom event so
// either one can flip the lock without prop drilling through SummaryStrip.

import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';

import {
  KAJA_STRICT_PRESET,
  RULEBOOK_DEFAULT,
  type SimulationConfig,
  simulate,
} from '@/lib/scoring/kajaSimulation';
import type { Researcher } from '@/lib/types';

const PASSWORD = 'KAJAZMAJA';
const STORAGE_KEY = 'nazivier:kaja-mode-unlocked';
const UNLOCK_EVENT = 'nazivier:kaja-unlock-changed';

function readUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  return window.sessionStorage.getItem(STORAGE_KEY) === '1';
}

function broadcastUnlock(unlocked: boolean) {
  if (typeof window === 'undefined') return;
  if (unlocked) window.sessionStorage.setItem(STORAGE_KEY, '1');
  else window.sessionStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(UNLOCK_EVENT, { detail: { unlocked } }));
}

function useKajaUnlock(): [boolean, (next: boolean) => void] {
  const [unlocked, setUnlockedState] = useState(false);
  useEffect(() => {
    setUnlockedState(readUnlocked());
    function onChange(e: Event) {
      const detail = (e as CustomEvent<{ unlocked: boolean }>).detail;
      setUnlockedState(!!detail?.unlocked);
    }
    window.addEventListener(UNLOCK_EVENT, onChange);
    return () => window.removeEventListener(UNLOCK_EVENT, onChange);
  }, []);
  return [unlocked, (next: boolean) => broadcastUnlock(next)];
}

/** Lock/unlock chip rendered inline next to the researcher name. */
export function KajaUnlockButton() {
  const t = useTranslations('kajaCalibration');
  const [unlocked, setUnlocked] = useKajaUnlock();
  const [showModal, setShowModal] = useState(false);
  const [entered, setEntered] = useState('');
  const [wrongTries, setWrongTries] = useState(0);

  function tryUnlock() {
    if (entered.trim().toUpperCase() === PASSWORD) {
      setUnlocked(true);
      setShowModal(false);
      setEntered('');
      setWrongTries(0);
    } else {
      setWrongTries((n) => n + 1);
    }
  }

  if (unlocked) {
    return (
      <button
        type="button"
        onClick={() => setUnlocked(false)}
        aria-label={t('relockButtonAria')}
        title={t('relockTooltip')}
        className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--accent)] text-[var(--accent)] transition hover:opacity-80"
      >
        <span aria-hidden className="text-sm">🔓</span>
      </button>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setShowModal(true)}
        aria-label={t('lockButtonAria')}
        title={t('lockTooltip')}
        className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
      >
        <span aria-hidden className="text-sm">🔒</span>
      </button>
      {showModal ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="kaja-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-white p-5 shadow-xl dark:bg-black"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="kaja-modal-title" className="text-base font-semibold">
              {t('modalTitle')}
            </h3>
            <p className="mt-1 text-xs text-[var(--muted)]">{t('modalIntro')}</p>
            <input
              type="password"
              autoFocus
              value={entered}
              onChange={(e) => setEntered(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') tryUnlock();
              }}
              placeholder={t('passwordPlaceholder')}
              className="mt-3 w-full rounded-md border border-[var(--border)] bg-transparent px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            />
            {wrongTries > 0 ? (
              <p className="mt-2 text-xs text-[var(--danger)]">{t('wrongPassword')}</p>
            ) : null}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setEntered('');
                  setWrongTries(0);
                }}
                className="rounded-md px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={tryUnlock}
                className="rounded-md bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-white hover:opacity-90"
              >
                {t('unlock')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

interface PanelProps {
  researcher: Researcher;
  /** Rulebook Σ from the official evaluator, for side-by-side display. */
  rulebookTotal: number;
}

const TITLE_ORDER: string[] = [
  'znanstveni-sodelavec',
  'visji-znanstveni-sodelavec',
  'znanstveni-svetnik',
  'strokovno-raziskovalni-sodelavec',
  'visji-strokovno-raziskovalni-sodelavec',
  'strokovno-raziskovalni-svetnik',
  'razvojni-sodelavec',
  'visji-razvojni-sodelavec',
  'razvojni-svetnik',
];

/** Full simulation panel rendered only when unlocked. */
export function KajaCalibrationPanel({ researcher, rulebookTotal }: PanelProps) {
  const t = useTranslations('kajaCalibration');
  const [unlocked] = useKajaUnlock();
  const [config, setConfig] = useState<SimulationConfig>(RULEBOOK_DEFAULT);

  const result = useMemo(() => simulate(researcher, config), [researcher, config]);

  const deltaPct = rulebookTotal > 0
    ? Math.round(((result.totalEquivalents - rulebookTotal) / rulebookTotal) * 100)
    : 0;

  // Render-time guard: panel is mounted but invisible until unlocked.
  if (!unlocked) return null;

  function patch(p: Partial<SimulationConfig>) {
    setConfig((prev) => ({ ...prev, ...p }));
  }

  function patchFactor(
    key: keyof SimulationConfig['customFactors'],
    val: number,
  ) {
    setConfig((prev) => ({
      ...prev,
      customFactors: { ...prev.customFactors, [key]: val },
    }));
  }

  return (
    <section className="rounded-lg border border-[var(--accent)] bg-[var(--muted-bg)] p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent)]">
          {t('panelTitle')}
        </h3>
        <span className="text-xs text-[var(--muted)]">{t('notForPassFail')}</span>
      </header>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{t('simSpec')}</p>

      {/* ── Presets ── */}
      <div className="mt-3 flex flex-wrap gap-2">
        <PresetButton
          label={t('presetRulebook')}
          onClick={() => setConfig(RULEBOOK_DEFAULT)}
          active={configsEqual(config, RULEBOOK_DEFAULT)}
        />
        <PresetButton
          label={t('presetKajaStrict')}
          onClick={() => setConfig(KAJA_STRICT_PRESET)}
          active={configsEqual(config, KAJA_STRICT_PRESET)}
        />
      </div>

      {/* ── Top summary cells ── */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Cell
          label={t('rulebookTotal')}
          value={fmt(rulebookTotal)}
          hint={t('rulebookHint')}
        />
        <Cell
          label={t('simTotal')}
          value={fmt(result.totalEquivalents)}
          hint={t('simHint')}
          emphasis
        />
        <Cell
          label={t('delta')}
          value={`${deltaPct > 0 ? '+' : ''}${deltaPct} %`}
          hint={result.totalEquivalents >= rulebookTotal ? t('deltaAbove') : t('deltaBelow')}
          tone={result.totalEquivalents >= rulebookTotal ? 'success' : 'warn'}
        />
      </div>

      {/* ── Pogoj 1: equivalents ── */}
      <Section title={t('sec1Title')} subtitle={t('sec1Subtitle')}>
        <ControlRow label={t('authPolicyLabel')}>
          <select
            value={config.authorshipPolicy}
            onChange={(e) =>
              patch({
                authorshipPolicy: e.target.value as SimulationConfig['authorshipPolicy'],
              })
            }
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs dark:bg-black"
          >
            <option value="pravilnik">{t('policyPravilnik')}</option>
            <option value="strict-first-corr">{t('policyStrict')}</option>
            <option value="lenient-all">{t('policyLenient')}</option>
            <option value="custom">{t('policyCustom')}</option>
          </select>
        </ControlRow>

        {config.authorshipPolicy === 'custom' ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <NumberSlider
              label={t('factorFirstCorr')}
              value={config.customFactors.firstOrCorresponding}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patchFactor('firstOrCorresponding', v)}
            />
            <NumberSlider
              label={t('factorEqual')}
              value={config.customFactors.equalOrCo}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patchFactor('equalOrCo', v)}
            />
            <NumberSlider
              label={t('factorOther')}
              value={config.customFactors.otherCoauthor}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patchFactor('otherCoauthor', v)}
            />
            <NumberSlider
              label={t('factorUnknown')}
              value={config.customFactors.unknown}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => patchFactor('unknown', v)}
            />
          </div>
        ) : null}

        <ControlRow label={t('q12Label')}>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={config.treatUnknownAsQ12}
              onChange={(e) => patch({ treatUnknownAsQ12: e.target.checked })}
            />
            {t('q12Hint')}
          </label>
        </ControlRow>

        <div className="grid gap-2 sm:grid-cols-3">
          <NumberSlider
            label={t('awardFactor')}
            value={config.awardFactor}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => patch({ awardFactor: v })}
          />
          <NumberSlider
            label={t('editorFactor')}
            value={config.editorFactor}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => patch({ editorFactor: v })}
          />
          <NumberSlider
            label={t('specialIssueFactor')}
            value={config.specialIssueFactor}
            min={0}
            max={1}
            step={0.05}
            onChange={(v) => patch({ specialIssueFactor: v })}
          />
        </div>

        <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          <Row k={t('countedPublications')} v={result.countedPublications} />
          <Row k={t('skippedPublications')} v={result.skippedPublications} />
          <Row k={t('publicationContribution')} v={fmt(result.publicationContribution)} />
          <Row
            k={t('extrasContribution')}
            v={fmt(
              result.awardContribution +
                result.editorContribution +
                result.specialIssueContribution,
            )}
          />
        </dl>

        <Methodology>{t('sec1Method')}</Methodology>
        <Limits items={[t('limit_authorship'), t('limit_senior'), t('limit_q12')]} />
      </Section>

      {/* ── Pogoj 2: citations / FTE ── */}
      <Section title={t('sec2Title')} subtitle={t('sec2Subtitle')}>
        <ControlRow label={t('citationSourceLabel')}>
          <select
            value={config.citationSource}
            onChange={(e) =>
              patch({ citationSource: e.target.value as SimulationConfig['citationSource'] })
            }
            className="rounded-md border border-[var(--border)] bg-white px-2 py-1 text-xs dark:bg-black"
          >
            <option value="wos">{t('citWos')}</option>
            <option value="scopus">{t('citScopus')}</option>
            <option value="openalex">{t('citOpenAlex')}</option>
            <option value="max-of-all">{t('citMax')}</option>
          </select>
        </ControlRow>

        <NumberInput
          label={t('externalFteLabel')}
          value={config.externalProjectsFteOverride ?? ''}
          placeholder={fmt(researcher.externalProjectsFte ?? 0)}
          onChange={(v) =>
            patch({ externalProjectsFteOverride: v === '' ? null : Number(v) })
          }
        />

        <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          <Row k={t('citationsUsed')} v={result.citationsUsed} />
          <Row k={t('citationSourceLabelDisplay')} v={result.citationSourceLabel} />
          <Row k={t('externalFteUsed')} v={fmt(result.externalProjectsFte)} />
        </dl>

        <Methodology>{t('sec2Method')}</Methodology>
        <Limits items={[t('limit_corresponding'), t('limit_selfcite'), t('limit_fte')]} />
      </Section>

      {/* ── Pogoj 3: leadership ── */}
      <Section title={t('sec3Title')} subtitle={t('sec3Subtitle')}>
        <div className="grid gap-2 sm:grid-cols-2">
          <NumberInput
            label={t('leadershipFteLabel')}
            value={config.leadershipFteOverride ?? ''}
            placeholder={fmt(researcher.leadership?.cumulativeFte ?? 0)}
            onChange={(v) =>
              patch({ leadershipFteOverride: v === '' ? null : Number(v) })
            }
          />
          <NumberInput
            label={t('leadershipYearsLabel')}
            value={config.leadershipYearsOverride ?? ''}
            placeholder={String(researcher.leadership?.leadershipYears ?? 0)}
            onChange={(v) =>
              patch({ leadershipYearsOverride: v === '' ? null : Number(v) })
            }
          />
        </div>

        <Methodology>{t('sec3Method')}</Methodology>
        <Limits items={[t('limit_fteValue'), t('limit_leadershipYears')]} />
      </Section>

      {/* ── Open Science ── */}
      <Section title={t('sec4Title')} subtitle={t('sec4Subtitle')}>
        <NumberSlider
          label={t('osThresholdLabel')}
          value={config.osThresholdRatio}
          min={0}
          max={1}
          step={0.05}
          onChange={(v) => patch({ osThresholdRatio: v })}
        />

        <dl className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
          <Row
            k={t('osCoverage')}
            v={`${result.osSatisfiedCount} / ${result.osTotalCount} (${Math.round(
              result.osRatio * 100,
            )} %)`}
          />
          <Row
            k={t('osVerdict')}
            v={result.osPasses ? `✓ ${t('passes')}` : `✗ ${t('fails')}`}
          />
        </dl>

        <Methodology>{t('sec4Method')}</Methodology>
        <Limits items={[t('limit_osDetection'), t('limit_osExemption')]} />
      </Section>

      {/* ── Pragovi ── */}
      <Section title={t('sec5Title')} subtitle={t('sec5Subtitle')}>
        <NumberSlider
          label={t('thresholdMultiplier')}
          value={config.thresholdMultiplier}
          min={0.5}
          max={3}
          step={0.05}
          onChange={(v) => patch({ thresholdMultiplier: v })}
        />
        <Methodology>{t('sec5Method')}</Methodology>
        <Limits items={[t('limit_threshold')]} />
      </Section>

      {/* ── Per-title pass/fail table ── */}
      <div className="mt-5 overflow-x-auto">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t('perTitleTitle')}
        </h4>
        <p className="mt-1 text-xs text-[var(--muted)]">{t('perTitleSpec')}</p>
        <table className="mt-2 w-full text-xs tabnum">
          <thead className="bg-[var(--muted-bg)] text-left">
            <tr>
              <th className="px-2 py-1 font-semibold">{t('thTitle')}</th>
              <th className="px-2 py-1 font-semibold">{t('thMinEq')}</th>
              <th className="px-2 py-1 font-semibold">{t('thMinCit')}</th>
              <th className="px-2 py-1 font-semibold">{t('thMinFte')}</th>
              <th className="px-2 py-1 font-semibold">{t('thMinLdFte')}</th>
              <th className="px-2 py-1 font-semibold">{t('thMinLdYr')}</th>
              <th className="px-2 py-1 font-semibold">{t('thStds')}</th>
              <th className="px-2 py-1 font-semibold">{t('thVerdict')}</th>
            </tr>
          </thead>
          <tbody>
            {result.perTitle
              .filter((row) => TITLE_ORDER.includes(row.title))
              .sort((a, b) => TITLE_ORDER.indexOf(a.title) - TITLE_ORDER.indexOf(b.title))
              .map((row) => (
                <tr key={row.title} className="border-t border-[var(--border)]">
                  <td className="px-2 py-1">{row.groupLabel}</td>
                  <td className="px-2 py-1">
                    <Pass on={row.pog1Pass} />
                    {row.minEquivalents == null ? '—' : fmt(row.minEquivalents)}
                  </td>
                  <td className="px-2 py-1">
                    <Pass on={row.pog2Pass} />
                    {row.minCitations == null ? '—' : Math.round(row.minCitations)}
                  </td>
                  <td className="px-2 py-1">
                    {row.minExternalProjectsFte == null
                      ? '—'
                      : fmt(row.minExternalProjectsFte)}
                  </td>
                  <td className="px-2 py-1">
                    <Pass on={row.pog3Pass} />
                    {row.minLeadershipFte == null ? '—' : fmt(row.minLeadershipFte)}
                  </td>
                  <td className="px-2 py-1">
                    {row.minLeadershipYears == null
                      ? '—'
                      : fmt(row.minLeadershipYears)}
                  </td>
                  <td className="px-2 py-1">
                    {row.standardsMet} / {row.standardsRequired}
                  </td>
                  <td className="px-2 py-1">
                    {row.overallPass ? (
                      <span className="font-semibold text-[var(--success)]">✓</span>
                    ) : (
                      <span className="text-[var(--muted)]">✗</span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted)]">
        <button
          type="button"
          onClick={() => setConfig(RULEBOOK_DEFAULT)}
          className="rounded-md border border-[var(--border)] px-3 py-1 hover:border-[var(--accent)]"
        >
          {t('resetRulebook')}
        </button>
        <span>{t('reminderNotPassFail')}</span>
      </div>
    </section>
  );
}

// ─── Small helpers ────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toLocaleString('sl-SI', { maximumFractionDigits: 2 });
}

function configsEqual(a: SimulationConfig, b: SimulationConfig): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function PresetButton({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
          : 'border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]'
      }`}
    >
      {label}
    </button>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <details className="mt-4 rounded-md border border-[var(--border)] p-3 open:bg-white/40 dark:open:bg-black/30">
      <summary className="cursor-pointer">
        <span className="text-sm font-semibold">{title}</span>
        <span className="ml-2 text-xs text-[var(--muted)]">{subtitle}</span>
      </summary>
      <div className="mt-3 space-y-3">{children}</div>
    </details>
  );
}

function ControlRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span className="font-semibold text-[var(--muted)]">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function NumberSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="flex items-baseline justify-between">
        <span className="font-semibold text-[var(--muted)]">{label}</span>
        <span className="tabnum">{value.toLocaleString('sl-SI', { maximumFractionDigits: 2 })}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
      />
    </label>
  );
}

function NumberInput({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: number | string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-semibold text-[var(--muted)]">{label}</span>
      <input
        type="number"
        step="0.1"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-[var(--border)] bg-white px-2 py-1 dark:bg-black"
      />
    </label>
  );
}

function Cell({
  label,
  value,
  hint,
  emphasis,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  emphasis?: boolean;
  tone?: 'success' | 'warn';
}) {
  const color =
    tone === 'success'
      ? 'text-[var(--success)]'
      : tone === 'warn'
        ? 'text-[var(--warn)]'
        : emphasis
          ? 'text-[var(--accent)]'
          : 'text-[var(--foreground)]';
  return (
    <div className="rounded-md border border-[var(--border)] bg-white p-3 dark:bg-black/20">
      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{label}</div>
      <div className={`mt-1 text-2xl font-semibold tabnum ${color}`}>{value}</div>
      <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: number | string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-[var(--border)] py-1">
      <dt className="text-[var(--muted)]">{k}</dt>
      <dd className="tabnum font-semibold">{v}</dd>
    </div>
  );
}

function Methodology({ children }: { children: React.ReactNode }) {
  return (
    <details className="rounded-md border border-dashed border-[var(--border)] p-2">
      <summary className="cursor-pointer text-xs font-semibold text-[var(--accent)]">
        Metodologija
      </summary>
      <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">{children}</p>
    </details>
  );
}

function Limits({ items }: { items: string[] }) {
  return (
    <details className="rounded-md border border-dashed border-[var(--border)] p-2">
      <summary className="cursor-pointer text-xs font-semibold text-[var(--warn)]">
        Omejitve
      </summary>
      <ul className="mt-1 ml-5 list-disc space-y-1 text-xs text-[var(--muted)]">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </details>
  );
}

function Pass({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={`mr-1 inline-block ${on ? 'text-[var(--success)]' : 'text-[var(--muted)]'}`}
    >
      {on ? '✓' : '✗'}
    </span>
  );
}
