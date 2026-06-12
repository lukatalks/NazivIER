'use client';

// Client-side helpers for the shared (server) inputs store. Talks to
// /api/inputs. All calls are best-effort: on any failure the app silently falls
// back to the localStorage cache, so a flaky network never blocks editing.

import type {
  PersistedResearcherInputs,
  PerPubOverride,
} from '@/lib/persistence/researcherStorage';

const SCHEMA_VERSION = 1;
const EDITOR_NAME_KEY = 'nazivier:editor-name';

type PersistableInputs = Omit<
  PersistedResearcherInputs,
  'schemaVersion' | 'sicrisId' | 'savedAt' | 'lastEditedBy'
> & { pubOverrides: Record<string, PerPubOverride> };

/** The editor's display name, remembered per-browser so they type it once. */
export function getEditorName(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(EDITOR_NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function setEditorName(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EDITOR_NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

/** Read the shared record for a researcher. Returns null when absent or on error. */
export async function fetchServerInputs(
  sicrisId: string,
): Promise<PersistedResearcherInputs | null> {
  try {
    const res = await fetch(`/api/inputs?id=${encodeURIComponent(sicrisId)}`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { inputs?: PersistedResearcherInputs | null };
    return data.inputs ?? null;
  } catch {
    return null;
  }
}

/** Write the shared record for a researcher. Server stamps savedAt. */
export async function pushServerInputs(
  sicrisId: string,
  inputs: PersistableInputs,
  editorName: string,
): Promise<void> {
  const blob: PersistedResearcherInputs = {
    ...inputs,
    schemaVersion: SCHEMA_VERSION,
    sicrisId,
    savedAt: new Date().toISOString(),
    ...(editorName.trim() ? { lastEditedBy: editorName.trim() } : {}),
  };
  try {
    await fetch('/api/inputs', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(blob),
    });
  } catch {
    /* offline – localStorage still holds the copy; it migrates up next load */
  }
}

/** Delete the shared record for a researcher. */
export async function deleteServerInputs(sicrisId: string): Promise<void> {
  try {
    await fetch(`/api/inputs?id=${encodeURIComponent(sicrisId)}`, {
      method: 'DELETE',
    });
  } catch {
    /* ignore */
  }
}
