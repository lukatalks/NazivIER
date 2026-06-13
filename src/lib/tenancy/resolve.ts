// Host -> tenant resolution. Pure functions, usable from RSC, route handlers and
// middleware. Resolution order:
//   1. exact host match against any tenant's `hosts` list
//   2. leading-subdomain label matched against a tenant id (e.g. ier.<brand>.si)
//   3. default tenant
//
// We read x-forwarded-host first because Vercel sits behind a proxy and `host`
// can be the internal value; x-forwarded-host carries the real requested domain.

import { DEFAULT_TENANT_ID, TENANTS } from '@/lib/tenancy/registry';
import type { TenantConfig } from '@/lib/tenancy/types';

export function getDefaultTenant(): TenantConfig {
  return TENANTS.find((t) => t.id === DEFAULT_TENANT_ID) ?? TENANTS[0];
}

export function getTenantById(id: string): TenantConfig {
  return TENANTS.find((t) => t.id === id) ?? getDefaultTenant();
}

/** Lowercase, strip a leading "www.", drop any port, take the first value of a
 *  comma-separated forwarded-host chain. */
function normalizeHost(host: string | null | undefined): string {
  if (!host) return '';
  const first = host.split(',')[0]?.trim().toLowerCase() ?? '';
  const noPort = first.split(':')[0];
  return noPort.replace(/^www\./, '');
}

export function resolveTenantFromHost(host: string | null | undefined): TenantConfig {
  const h = normalizeHost(host);
  if (!h) return getDefaultTenant();

  const exact = TENANTS.find((t) => t.hosts.some((x) => normalizeHost(x) === h));
  if (exact) return exact;

  const label = h.split('.')[0];
  const byLabel = TENANTS.find((t) => t.id === label);
  if (byLabel) return byLabel;

  return getDefaultTenant();
}

/** Pick the requested host out of a Fetch/Next request's headers. */
function hostFromRequest(request: Request): string | null {
  return request.headers.get('x-forwarded-host') ?? request.headers.get('host');
}

export function resolveTenantFromRequest(request: Request): TenantConfig {
  return resolveTenantFromHost(hostFromRequest(request));
}

export function resolveTenantIdFromRequest(request: Request): string {
  return resolveTenantFromRequest(request).id;
}
