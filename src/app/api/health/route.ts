import { NextResponse } from 'next/server';

import { cacheBackend } from '@/lib/cache/redis';
import { scimagoCoverage } from '@/lib/scimago/quartiles';
import { ALGO_VERSION, APP_VERSION, COMMIT_REF, COMMIT_SHA, ENV } from '@/lib/version';

export const runtime = 'nodejs';

/** Minimal health endpoint – surfaces feature flags and snapshot freshness so
 *  IER can see at a glance which integrations are hot. Not for monitoring,
 *  just for human debugging. */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    app: { version: APP_VERSION, algorithm: ALGO_VERSION, env: ENV, ref: COMMIT_REF, sha: COMMIT_SHA },
    cache: cacheBackend(),
    scimagoJournals: scimagoCoverage(),
    integrations: {
      openalex: true,
      sicris: true,
      sicrisCitationsScrape: true,
      ierProjectsScrape: true,
      upstashRedis: cacheBackend() === 'upstash-redis',
      vercelAnalytics: true,
      vercelSpeedInsights: true,
    },
    rulebook: {
      version: ALGO_VERSION,
      annexesEvaluated: [2, 3],
      articlesImplemented: ['9', '10', '11', '11(6)', '14(5)', '22(1)', '22(2)'],
      openScienceDemoPass:
        (process.env.OS_DEMO_PASS ?? 'true').toLowerCase() !== 'false',
    },
    builtAt: new Date().toISOString(),
  });
}
