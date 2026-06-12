// Local persistence layer for per-researcher manual inputs.
//
// Purpose: researcher fills in education level, EUR amounts, work years,
// per-publication authorship + OA overrides. Without persistence, every
// refresh/close-tab loses all of this (hours of work for prolific researchers).
//
// Strategy: keep it client-side only (no server, no auth). Key by SICRIS ID so
// multiple researchers on a shared workstation don't collide. Versioned blob
// so future schema changes can migrate or discard cleanly.
//
// What is persisted:
//   * researcher.educationLevel (user override, not the inferred one)
//   * researcher.yearsInResearchSector
//   * researcher.externalProjectsValueEur
//   * researcher.leadership.{cumulativeValueEur, leadershipYears}
//   * researcher.extraAchievements.{weight10Count, weight05Count, weight03Count}
//   * researcher.isReelection
//   * researcher.additionalDepositsPlanned
//   * publication-level overrides keyed by publication.id:
//       - authorshipRole
//       - openAccessOverride
//
// What is NOT persisted:
//   * SICRIS-fetched bibliography / citations / OpenAlex enrichments (re-fetched
//     each time; lets backend updates surface to the user automatically).
//   * Snapshot timestamps.

import type {
  AuthorshipRole,
  EducationLevel,
  ExtraAchievements,
  LeadershipRecord,
  OpenAccessStatus,
  Publication,
  Researcher,
} from '@/lib/types';

const SCHEMA_VERSION = 1;
const STORAGE_PREFIX = 'nazivier:researcher:v1:';

export interface PerPubOverride {
  authorshipRole?: AuthorshipRole;
  openAccessOverride?: OpenAccessStatus;
}

export interface PersistedResearcherInputs {
  schemaVersion: number;
  sicrisId: string;
  savedAt: string; // ISO timestamp
  /** Free-text name of whoever last saved this record (shared-store trust model,
   *  no login). Optional – omitted when the editor left the name field blank. */
  lastEditedBy?: string;
  educationLevel?: EducationLevel;
  yearsInResearchSector?: number;
  externalProjectsValueEur?: number;
  leadership?: LeadershipRecord;
  extraAchievements?: ExtraAchievements;
  isReelection?: boolean;
  additionalDepositsPlanned?: number;
  /** Keyed by publication.id */
  pubOverrides: Record<string, PerPubOverride>;
}

function storageKey(sicrisId: string): string {
  return `${STORAGE_PREFIX}${sicrisId}`;
}

function safeWindow(): Window | null {
  if (typeof window === 'undefined') return null;
  try {
    // Some SSR / strict-mode environments throw on access.
    void window.localStorage;
    return window;
  } catch {
    return null;
  }
}

/** Read the persisted blob for a SICRIS ID. Returns null when missing or
 *  malformed (we never throw on bad cache — silently discard). */
export function loadPersistedInputs(
  sicrisId: string,
): PersistedResearcherInputs | null {
  const w = safeWindow();
  if (!w) return null;
  try {
    const raw = w.localStorage.getItem(storageKey(sicrisId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedResearcherInputs;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    if (parsed.sicrisId !== sicrisId) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Save the current state for this researcher. Silently swallows write errors
 *  (private-browsing / quota / disabled storage). */
export function savePersistedInputs(
  sicrisId: string,
  inputs: Omit<PersistedResearcherInputs, 'schemaVersion' | 'sicrisId' | 'savedAt'>,
): void {
  const w = safeWindow();
  if (!w) return;
  const blob: PersistedResearcherInputs = {
    schemaVersion: SCHEMA_VERSION,
    sicrisId,
    savedAt: new Date().toISOString(),
    ...inputs,
  };
  try {
    w.localStorage.setItem(storageKey(sicrisId), JSON.stringify(blob));
  } catch {
    /* ignore quota / disabled */
  }
}

/** Write a complete blob verbatim into localStorage, preserving its savedAt /
 *  lastEditedBy. Used to mirror the authoritative server copy into the local
 *  cache without stamping a fresh timestamp. */
export function savePersistedBlob(blob: PersistedResearcherInputs): void {
  const w = safeWindow();
  if (!w) return;
  if (blob.schemaVersion !== SCHEMA_VERSION || !blob.sicrisId) return;
  try {
    w.localStorage.setItem(storageKey(blob.sicrisId), JSON.stringify(blob));
  } catch {
    /* ignore quota / disabled */
  }
}

/** Remove the persisted blob entirely. */
export function clearPersistedInputs(sicrisId: string): void {
  const w = safeWindow();
  if (!w) return;
  try {
    w.localStorage.removeItem(storageKey(sicrisId));
  } catch {
    /* ignore */
  }
}

/** Project a Researcher object into the persistence-shaped blob. */
export function extractPersistableInputs(
  r: Researcher,
): Omit<PersistedResearcherInputs, 'schemaVersion' | 'sicrisId' | 'savedAt'> {
  const pubOverrides: Record<string, PerPubOverride> = {};
  for (const p of r.publications) {
    const entry: PerPubOverride = {};
    if (p.authorshipRole) entry.authorshipRole = p.authorshipRole;
    if (p.openAccessOverride) entry.openAccessOverride = p.openAccessOverride;
    if (entry.authorshipRole || entry.openAccessOverride) {
      pubOverrides[p.id] = entry;
    }
  }
  return {
    educationLevel: r.educationLevel,
    yearsInResearchSector: r.yearsInResearchSector,
    externalProjectsValueEur: r.externalProjectsValueEur,
    leadership: r.leadership,
    extraAchievements: r.extraAchievements,
    isReelection: r.isReelection,
    additionalDepositsPlanned: r.additionalDepositsPlanned,
    pubOverrides,
  };
}

/** Apply a persisted blob onto a freshly-fetched Researcher, merging
 *  per-publication overrides into the publications array. Returns a NEW
 *  Researcher (does not mutate the input). */
export function applyPersistedInputs<R extends Researcher>(
  fresh: R,
  persisted: PersistedResearcherInputs,
): R {
  const patchedPubs: Publication[] = fresh.publications.map((p) => {
    const ov = persisted.pubOverrides[p.id];
    if (!ov) return p;
    return {
      ...p,
      ...(ov.authorshipRole !== undefined
        ? { authorshipRole: ov.authorshipRole }
        : {}),
      ...(ov.openAccessOverride !== undefined
        ? { openAccessOverride: ov.openAccessOverride }
        : {}),
    };
  });
  return {
    ...fresh,
    publications: patchedPubs,
    // Only override scalar fields when the persisted blob defined them; never
    // wipe a freshly-fetched value with undefined.
    ...(persisted.educationLevel !== undefined
      ? { educationLevel: persisted.educationLevel }
      : {}),
    ...(persisted.yearsInResearchSector !== undefined
      ? { yearsInResearchSector: persisted.yearsInResearchSector }
      : {}),
    ...(persisted.externalProjectsValueEur !== undefined
      ? { externalProjectsValueEur: persisted.externalProjectsValueEur }
      : {}),
    ...(persisted.leadership !== undefined ? { leadership: persisted.leadership } : {}),
    ...(persisted.extraAchievements !== undefined
      ? { extraAchievements: persisted.extraAchievements }
      : {}),
    ...(persisted.isReelection !== undefined
      ? { isReelection: persisted.isReelection }
      : {}),
    ...(persisted.additionalDepositsPlanned !== undefined
      ? { additionalDepositsPlanned: persisted.additionalDepositsPlanned }
      : {}),
  };
}

/** Serialise the current inputs to a JSON string suitable for email backup. */
export function exportInputsAsJson(r: Researcher): string {
  const blob: PersistedResearcherInputs = {
    schemaVersion: SCHEMA_VERSION,
    sicrisId: r.sicrisId,
    savedAt: new Date().toISOString(),
    ...extractPersistableInputs(r),
  };
  return JSON.stringify(blob, null, 2);
}

/** Parse a previously-exported JSON blob. Returns null on any failure. */
export function importInputsFromJson(
  text: string,
): PersistedResearcherInputs | null {
  try {
    const parsed = JSON.parse(text.trim()) as PersistedResearcherInputs;
    if (parsed.schemaVersion !== SCHEMA_VERSION) return null;
    if (!parsed.sicrisId || typeof parsed.sicrisId !== 'string') return null;
    if (!parsed.pubOverrides || typeof parsed.pubOverrides !== 'object') {
      parsed.pubOverrides = {};
    }
    return parsed;
  } catch {
    return null;
  }
}
