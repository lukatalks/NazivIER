import { NextResponse } from 'next/server';

import { cacheBackend } from '@/lib/cache/redis';
import { scimagoCoverage } from '@/lib/scimago/quartiles';

export const runtime = 'nodejs';

/** Minimal health endpoint — surfaces feature flags and snapshot freshness so
 *  IER can see at a glance which integrations are hot. Not for monitoring,
 *  just for human debugging. */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    cache: cacheBackend(),
    scimagoJournals: scimagoCoverage(),
    integrations: {
      openalex: true,
      sicris: true,
      upstashRedis: cacheBackend() === 'upstash-redis',
    },
    rulebook: {
      version: '2026-05-26-draft',
      annexesEvaluated: [2, 3],
      articlesImplemented: ['9', '10', '11', '11(6)', '14(5)', '22(1)', '22(2)'],
    },
    builtAt: new Date().toISOString(),
  });
}
