// Tiny cache abstraction backed by Upstash Redis (REST) with an in-memory
// fallback for local dev. The fallback expires entries on access — keeps memory
// bounded in long-running server processes.
//
// Why Upstash REST vs node-redis: REST works in every runtime Vercel ships
// (Node, Edge, Fluid) without TCP-pool tuning, and the free tier (256 MB,
// 500k commands/month) is enough for NazivIER's per-researcher cache load.
//
// Provisioning (one-time, by hand):
//   1) https://console.upstash.com → Create Redis → eu-west-1 → Free tier
//   2) Copy UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN
//   3) `vercel env add UPSTASH_REDIS_REST_URL` (prod + preview + dev)
//      `vercel env add UPSTASH_REDIS_REST_TOKEN` (prod + preview + dev)
//   4) `vercel --prod` to redeploy. No code change needed — this module
//      transparently switches from in-memory to Redis when both vars are set.

import { Redis } from '@upstash/redis';

interface MemEntry {
  value: unknown;
  expiresAt: number;
}

const memStore = new Map<string, MemEntry>();

let redisClient: Redis | null = null;
let redisInitialised = false;

function getRedis(): Redis | null {
  if (redisInitialised) return redisClient;
  redisInitialised = true;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  redisClient = new Redis({ url, token });
  return redisClient;
}

/** Cache hit reason — surfaced via response headers when caller wants to know. */
export type CacheStatus = 'redis-hit' | 'memory-hit' | 'miss' | 'no-cache';

export interface CacheResult<T> {
  value: T;
  status: CacheStatus;
}

/** Get a value from the cache (Redis first, memory next). Returns
 *  `{ value: null, status: 'miss' }` when nothing's cached. */
export async function cacheGet<T>(key: string): Promise<CacheResult<T | null>> {
  const r = getRedis();
  if (r) {
    try {
      const v = await r.get<T>(key);
      if (v !== null && v !== undefined) return { value: v, status: 'redis-hit' };
    } catch {
      /* fall through to memory */
    }
  }
  const entry = memStore.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return { value: entry.value as T, status: 'memory-hit' };
  }
  if (entry) memStore.delete(key);
  return { value: null, status: 'miss' };
}

/** Store a value with TTL (seconds). Best-effort; failures don't throw. */
export async function cacheSet(key: string, value: unknown, ttlSec: number): Promise<void> {
  const r = getRedis();
  if (r) {
    try {
      await r.set(key, value as object, { ex: ttlSec });
    } catch {
      /* swallow */
    }
  }
  memStore.set(key, { value, expiresAt: Date.now() + ttlSec * 1000 });
}

/** Wrap an async function with cache. The first call computes + stores; later
 *  calls within ttlSec return the cached value. */
export async function cached<T>(
  key: string,
  ttlSec: number,
  compute: () => Promise<T>,
): Promise<T> {
  const hit = await cacheGet<T>(key);
  if (hit.value !== null) return hit.value;
  const value = await compute();
  if (value !== null && value !== undefined) {
    await cacheSet(key, value, ttlSec);
  }
  return value;
}

/** Diagnostic for /api/health — whether Redis is hot. */
export function cacheBackend(): 'upstash-redis' | 'memory-only' {
  return getRedis() ? 'upstash-redis' : 'memory-only';
}
