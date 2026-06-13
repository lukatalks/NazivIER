// Server-only tenant access for React Server Components and `generateMetadata`.
// Reading the Host header via next/headers makes the route render dynamically,
// which is inherent to single-deployment, host-routed multi-tenancy (the tenant
// is only known at request time).

import { headers } from 'next/headers';

import { resolveTenantFromHost } from '@/lib/tenancy/resolve';
import type { TenantConfig } from '@/lib/tenancy/types';

export async function getTenant(): Promise<TenantConfig> {
  const h = await headers();
  return resolveTenantFromHost(h.get('x-forwarded-host') ?? h.get('host'));
}
