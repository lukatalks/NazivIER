'use client';

import { useTranslations } from 'next-intl';
import { useMemo, useState } from 'react';

import type {
  AuthorshipRole,
  EducationLevel,
  Publication,
  Researcher,
} from '@/lib/types';

interface Props {
  researcher: Researcher;
  onChange(patch: Partial<Researcher>): void;
}

export function MetadataPanel({ researcher: r, onChange }: Props) {
  const t = useTranslations('metadata');
  const [open, setOpen] = useState(false);
  const [pubFilter, setPubFilter] = useState<'evaluated' | 'all'>('evaluated');
  const [pubLimit, setPubLimit] = useState(25);

  // Publications shown in the authorship-override table. "Evaluated" = anything
  // the weights table touches (typology 1.x / 2.x). "All" = everything,
  // including 1.16 abstracts and 2.x reports.
  const orderedPubs = useMemo(() => {
    const sorted = [...r.publications].sort(
      (a, b) => (b.year || 0) - (a.year || 0),
    );
    if (pubFilter === 'all') return sorted;
    return sorted.filter((p) => /^[12]\./.test(p.typology));
  }, [r.publications, pubFilter]);

  function setAuthorshipRole(pubId: string, role: AuthorshipRole | undefined) {
    const next = r.publications.map((p) =>
      p.id === pubId ? { ...p, authorshipRole: role } : p,
    );
    onChange({ publications: next });
  }

  return (
    <section className="rounded-lg border border-[var(--border)] bg-[var(--muted-bg)] p-4 sm:p-5">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t('title')}
          </h2>
          <p className="text-xs text-[var(--muted)]">{t('subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="shrink-0 text-sm text-[var(--accent)] underline-offset-4 hover:underline"
        >
          {open ? t('close') : t('open')}
        </button>
      </header>

      {open ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">{t('fields.educationLevel')}</span>
            <select
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
              value={r.educationLevel ?? ''}
              onChange={(e) =>
                onChange({
                  educationLevel: (Number(e.target.value) || undefined) as
                    | EducationLevel
                    | undefined,
                })
              }
            >
              <option value="">{t('fields.educationOptions.none')}</option>
              <option value="8">{t('fields.educationOptions.8')}</option>
              <option value="9">{t('fields.educationOptions.9')}</option>
              <option value="10">{t('fields.educationOptions.10')}</option>
            </select>
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">{t('fields.yearsInResearchSector')}</span>
            <input
              type="number"
              min={0}
              max={60}
              value={r.yearsInResearchSector ?? ''}
              onChange={(e) =>
                onChange({ yearsInResearchSector: Number(e.target.value) || undefined })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">{t('fields.externalProjectsFte')}</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={r.externalProjectsFte ?? ''}
              onChange={(e) =>
                onChange({ externalProjectsFte: Number(e.target.value) || undefined })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">{t('fields.leadershipFte')}</span>
            <input
              type="number"
              step="0.1"
              min={0}
              value={r.leadership?.cumulativeFte ?? ''}
              onChange={(e) =>
                onChange({
                  leadership: {
                    ...r.leadership,
                    cumulativeFte: Number(e.target.value) || 0,
                    leadershipYears: r.leadership?.leadershipYears ?? 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col">
            <span className="text-xs text-[var(--muted)]">{t('fields.leadershipYears')}</span>
            <input
              type="number"
              min={0}
              max={60}
              value={r.leadership?.leadershipYears ?? ''}
              onChange={(e) =>
                onChange({
                  leadership: {
                    cumulativeFte: r.leadership?.cumulativeFte ?? 0,
                    leadershipYears: Number(e.target.value) || 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">{t('fields.weight10Count')}</span>
            <input
              type="number"
              min={0}
              max={500}
              value={r.extraAchievements?.weight10Count ?? ''}
              onChange={(e) =>
                onChange({
                  extraAchievements: {
                    weight10Count: Number(e.target.value) || 0,
                    weight05Count: r.extraAchievements?.weight05Count ?? 0,
                    weight03Count: r.extraAchievements?.weight03Count ?? 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">{t('fields.weight05Count')}</span>
            <input
              type="number"
              min={0}
              max={500}
              value={r.extraAchievements?.weight05Count ?? ''}
              onChange={(e) =>
                onChange({
                  extraAchievements: {
                    weight10Count: r.extraAchievements?.weight10Count ?? 0,
                    weight05Count: Number(e.target.value) || 0,
                    weight03Count: r.extraAchievements?.weight03Count ?? 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col sm:col-span-2">
            <span className="text-xs text-[var(--muted)]">{t('fields.weight03Count')}</span>
            <input
              type="number"
              min={0}
              max={500}
              value={r.extraAchievements?.weight03Count ?? ''}
              onChange={(e) =>
                onChange({
                  extraAchievements: {
                    weight10Count: r.extraAchievements?.weight10Count ?? 0,
                    weight05Count: r.extraAchievements?.weight05Count ?? 0,
                    weight03Count: Number(e.target.value) || 0,
                  },
                })
              }
              className="mt-1 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
            />
          </label>

          <label className="flex flex-col sm:col-span-2 lg:col-span-4 mt-2 border-t border-[var(--border)] pt-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
              {t('fields.reelectionLabel')}
            </span>
            <span className="mt-1 inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!r.isReelection}
                onChange={(e) => onChange({ isReelection: e.target.checked })}
                className="h-4 w-4 rounded border-[var(--border)]"
              />
              {t('fields.reelectionHelp')}
            </span>
          </label>

          {/* Article 11(6) honest input: when OpenAlex finds post-2024 publications
              that are not (yet) open access, the user can declare how many of
              the remaining works they have already deposited (but OpenAlex has
              not yet indexed) or commit to depositing before the application is
              reviewed. The evaluator recomputes the OA ratio with those counts
              and applies the rulebook's 100 % threshold honestly – nothing is
              bypassed. */}
          {r.openScienceCompliance &&
          r.openScienceCompliance.postOrdinanceCount > 0 &&
          !r.openScienceCompliance.fullyCompliant ? (
            <label className="flex flex-col sm:col-span-2 lg:col-span-4 mt-2 border-t border-[var(--border)] pt-3">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                {t('fields.additionalDepositsLabel')}
              </span>
              <span className="text-xs text-[var(--muted)] mt-1">
                {t('fields.additionalDepositsHelp', {
                  missing:
                    r.openScienceCompliance.postOrdinanceCount -
                    r.openScienceCompliance.depositedCount,
                  total: r.openScienceCompliance.postOrdinanceCount,
                  deposited: r.openScienceCompliance.depositedCount,
                })}
              </span>
              <input
                type="number"
                min={0}
                max={
                  r.openScienceCompliance.postOrdinanceCount -
                  r.openScienceCompliance.depositedCount
                }
                step={1}
                value={r.additionalDepositsPlanned ?? ''}
                onChange={(e) =>
                  onChange({
                    additionalDepositsPlanned:
                      Number(e.target.value) || undefined,
                  })
                }
                className="mt-2 w-32 rounded-md border border-[var(--border)] bg-white dark:bg-black/30 px-2 py-1"
              />
            </label>
          ) : null}

          {/* IER-website leadership pre-fill notice. The evaluator already uses
              the scraped ledYears as a fallback for Pogoj 3, but we surface it
              here as evidence so the user knows where the number came from
              and can override it if reality differs. */}
          {r.ierProjectLeadership && r.ierProjectLeadership.ledCount > 0 ? (
            <div className="sm:col-span-2 lg:col-span-4 mt-2 border-t border-[var(--border)] pt-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                {t('fields.ierLeadershipLabel')}
              </div>
              <p className="text-xs text-[var(--muted)] mt-1">
                {t('fields.ierLeadershipHelp', {
                  count: r.ierProjectLeadership.ledCount,
                  years: r.ierProjectLeadership.ledYears,
                  external: r.ierProjectLeadership.ledExternalCount,
                })}{' '}
                <a
                  href={r.ierProjectLeadership.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  ier.si/projekti ↗
                </a>
              </p>
              <ul className="mt-2 ml-4 list-disc text-xs space-y-1">
                {r.ierProjectLeadership.led.slice(0, 8).map((p) => (
                  <li key={p.url}>
                    <a
                      href={p.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[var(--accent)] underline-offset-2 hover:underline"
                    >
                      {p.title}
                    </a>{' '}
                    <span className="text-[var(--muted)]">
                      {p.code ? `· ${p.code} ` : ''}
                      {p.funder ? `· ${p.funder} ` : ''}
                      {p.startDate ? `· ${p.startDate}` : ''}
                      {p.endDate ? `–${p.endDate}` : ''}
                    </span>
                  </li>
                ))}
                {r.ierProjectLeadership.led.length > 8 ? (
                  <li className="text-[var(--muted)]">
                    {t('fields.ierLeadershipMore', {
                      count: r.ierProjectLeadership.led.length - 8,
                    })}
                  </li>
                ) : null}
              </ul>
            </div>
          ) : null}

          {/* Per-publication authorship overrides.
              The COBISS bibliography feed does not expose who was first or
              corresponding author, so we default every entry to 0.7
              (enakovredno avtorstvo). Annex 3 lets the user mark each work as
              first/corresponding (1.0) or other co-authorship (0.3). Setting
              these correctly is what turns a generic 0.7 weighted score into
              the precise number an evaluator would compute. */}
          {orderedPubs.length > 0 ? (
            <div className="sm:col-span-2 lg:col-span-4 mt-2 border-t border-[var(--border)] pt-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
                    {t('fields.authorshipPerPubLabel')}
                  </div>
                  <p className="text-xs text-[var(--muted)] mt-1 max-w-3xl">
                    {t('fields.authorshipPerPubHelp')}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      setPubFilter(pubFilter === 'evaluated' ? 'all' : 'evaluated')
                    }
                    className="rounded-md border border-[var(--border)] px-2 py-1 hover:bg-white dark:hover:bg-black/30"
                  >
                    {pubFilter === 'evaluated'
                      ? t('fields.authorshipShowAll')
                      : t('fields.authorshipShowEvaluated')}
                  </button>
                </div>
              </div>
              <div className="mt-2 overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="text-[var(--muted)]">
                    <tr className="border-b border-[var(--border)]">
                      <th className="py-1.5 pr-3 text-left">{t('fields.authorshipColYear')}</th>
                      <th className="py-1.5 pr-3 text-left">{t('fields.authorshipColTitle')}</th>
                      <th className="py-1.5 pr-3 text-left">{t('fields.authorshipColTyp')}</th>
                      <th className="py-1.5 pr-3 text-left">{t('fields.authorshipColRole')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orderedPubs.slice(0, pubLimit).map((p) => (
                      <AuthorshipRow
                        key={p.id}
                        pub={p}
                        onChange={(role) => setAuthorshipRole(p.id, role)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {orderedPubs.length > pubLimit ? (
                <button
                  type="button"
                  onClick={() => setPubLimit((n) => n + 25)}
                  className="mt-2 text-xs text-[var(--accent)] underline-offset-2 hover:underline"
                >
                  {t('fields.authorshipShowMore', {
                    remaining: orderedPubs.length - pubLimit,
                  })}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

interface AuthorshipRowProps {
  pub: Publication;
  onChange(role: AuthorshipRole | undefined): void;
}

function AuthorshipRow({ pub, onChange }: AuthorshipRowProps) {
  const t = useTranslations('metadata');
  const role = pub.authorshipRole;
  return (
    <tr className="border-b border-[var(--border)]/40 align-top">
      <td className="py-1.5 pr-3 tabnum">{pub.year || '–'}</td>
      <td className="py-1.5 pr-3">
        <div className="line-clamp-2 max-w-md">{pub.title}</div>
        {pub.parentTitle ? (
          <div className="text-[var(--muted)] italic">{pub.parentTitle}</div>
        ) : null}
      </td>
      <td className="py-1.5 pr-3 font-mono">{pub.typology}</td>
      <td className="py-1.5 pr-3">
        <div className="flex flex-wrap gap-3">
          <RoleOption
            label={t('fields.authorshipRoleFirst')}
            current={role}
            value="first-or-corresponding"
            pubId={pub.id}
            onChange={onChange}
          />
          <RoleOption
            label={t('fields.authorshipRoleEqual')}
            current={role}
            value="equal-or-co"
            pubId={pub.id}
            onChange={onChange}
          />
          <RoleOption
            label={t('fields.authorshipRoleOther')}
            current={role}
            value="other-coauthor"
            pubId={pub.id}
            onChange={onChange}
          />
        </div>
      </td>
    </tr>
  );
}

interface RoleOptionProps {
  label: string;
  current: AuthorshipRole | undefined;
  value: AuthorshipRole;
  pubId: string;
  onChange(role: AuthorshipRole | undefined): void;
}

function RoleOption({ label, current, value, pubId, onChange }: RoleOptionProps) {
  // Treat "no value" as equivalent to the equal/co default so the radio shows
  // a populated state without forcing the user to click before promoting/demoting.
  const effective = current ?? 'equal-or-co';
  const checked = effective === value;
  return (
    <label className="inline-flex items-center gap-1 whitespace-nowrap">
      <input
        type="radio"
        name={`auth-${pubId}`}
        checked={checked}
        onChange={() => onChange(value)}
        className="h-3.5 w-3.5"
      />
      <span>{label}</span>
    </label>
  );
}
