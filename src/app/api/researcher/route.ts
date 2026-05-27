import { NextResponse } from 'next/server';

import { fetchResearcherSnapshot } from '@/lib/sicris/client';
import { extractSicrisId } from '@/lib/sicris/url';

export const runtime = 'nodejs';

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
