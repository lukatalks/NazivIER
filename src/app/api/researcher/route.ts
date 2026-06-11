import { NextResponse } from 'next/server';

import { fetchResearcherSnapshot } from '@/lib/sicris/client';
import { extractSicrisId } from '@/lib/sicris/url';

export const runtime = 'nodejs';
// Pin compute to Frankfurt – closest Vercel region to Slovenia/IZUM. The default
// (US-East) added transatlantic latency that tipped COBISS past its timeout and
// 500'd large bibliographies. fra1 keeps the heavy biblio fetch fast enough.
export const preferredRegion = 'fra1';
// Safety net so a fully-down COBISS can't keep the function alive forever; the
// snapshot's own per-attempt timeouts + graceful degradation resolve well before.
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const raw = url.searchParams.get('id') ?? '';
  const sicrisId = extractSicrisId(raw);
  if (!sicrisId) {
    return NextResponse.json(
      { error: `Neveljaven SICRIS ID ali URL: "${raw}"` },
      { status: 400 },
    );
  }
  try {
    const snapshot = await fetchResearcherSnapshot(sicrisId);
    return NextResponse.json({
      sicrisId,
      ...snapshot,
      fetchedAt: new Date().toISOString(),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
