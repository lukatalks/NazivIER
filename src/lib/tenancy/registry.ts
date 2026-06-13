// Tenant registry. Add a new institute here (plus its file under tenants/) and
// point its domain at this deployment — no other code change is required.

import { IER_TENANT } from '@/lib/tenancy/tenants/ier';
import type { TenantConfig } from '@/lib/tenancy/types';

/** Fallback when the request Host matches no tenant (e.g. preview URLs, local dev). */
export const DEFAULT_TENANT_ID = 'ier';

export const TENANTS: TenantConfig[] = [IER_TENANT];
