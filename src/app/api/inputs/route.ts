import { NextResponse } from 'next/server';

import { storeDelete, storeGet, storeSet } from '@/lib/cache/redis';
import type { PersistedResearcherInputs } from '@/lib/persistence/researcherStorage';
import { extractSicrisId } from '@/lib/sicris/url';

// Shared, login-less store for per-researcher manual inputs (authorship, OA,
// EUR amounts, education, years). Trust model: anyone at the institute can read
// or write any researcher's inputs, so the calibration panel always reflects the
// realistic state people have entered. Every write stamps `lastEditedBy` +
// `savedAt` for transparency. The single source of truth is Redis; localStorage
// is only a per-browser cache layered on top.
//
// White-label note: each institute is its own deployment with its own Redis, so
// data isolation is structural — there is no shared keyspace across institutes.

export const runtime = 'nodejs';
export const preferredRegion = 'fra1';

const SCHEMA_VERSION = 1;
const KEY_PREFIX = 'nazivier:inputs:v1:';
// A complete inputs blob is a few KB even for the most prolific researcher.
// Reject anything wildly larger as malformed/abusive.
const MAX_BODY_BYTES = 256 * 1024;

function keyFor(sicrisId: string): string {
  return `${KEY_PREFIX}${sicrisId}`;
}

/** GET /api/inputs?id=12345 → { inputs: PersistedResearcherInputs | null } */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const sicrisId = extractSicrisId(url.searchParams.get('id') ?? '');
  if (!sicrisId) {
    return NextResponse.json({ error: 'Neveljaven SICRIS ID' }, { status: 400 });
  }
  const inputs = await storeGet<PersistedResearcherInputs>(keyFor(sicrisId));
  return NextResponse.json(
    { inputs: inputs ?? null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

/** PUT /api/inputs  body = PersistedResearcherInputs → { ok: true } */
export async function PUT(request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: 'Body too large' }, { status: 413 });
  }

  let body: Partial<PersistedResearcherInputs>;
  try {
    body = JSON.parse(text) as Partial<PersistedResearcherInputs>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.schemaVersion !== SCHEMA_VERSION) {
    return NextResponse.json({ error: 'Unsupported schemaVersion' }, { status: 400 });
  }
  const sicrisId = extractSicrisId(body.sicrisId ?? '');
  if (!sicrisId) {
    return NextResponse.json({ error: 'Neveljaven SICRIS ID' }, { status: 400 });
  }
  if (body.pubOverrides == null || typeof body.pubOverrides !== 'object') {
    return NextResponse.json({ error: 'Missing pubOverrides' }, { status: 400 });
  }

  // Server stamps savedAt so timestamps are clock-consistent regardless of the
  // editor's local clock. lastEditedBy is trimmed + length-capped.
  const lastEditedBy =
    typeof body.lastEditedBy === 'string'
      ? body.lastEditedBy.trim().slice(0, 80) || undefined
      : undefined;

  const blob: PersistedResearcherInputs = {
    ...(body as PersistedResearcherInputs),
    schemaVersion: SCHEMA_VERSION,
    sicrisId,
    savedAt: new Date().toISOString(),
    lastEditedBy,
  };

  await storeSet(keyFor(sicrisId), blob);
  return NextResponse.json({ ok: true, savedAt: blob.savedAt });
}

/** DELETE /api/inputs?id=12345 → { ok: true } */
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const sicrisId = extractSicrisId(url.searchParams.get('id') ?? '');
  if (!sicrisId) {
    return NextResponse.json({ error: 'Neveljaven SICRIS ID' }, { status: 400 });
  }
  await storeDelete(keyFor(sicrisId));
  return NextResponse.json({ ok: true });
}
