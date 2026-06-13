import { NextResponse } from 'next/server';

import { resolveTenantFromRequest } from '@/lib/tenancy/resolve';

// Pin to Frankfurt for consistency with the researcher route (closest region to
// Slovenia). The roster is static seed data per tenant, so this is just
// defensive parity.
export const preferredRegion = 'fra1';

// Serves the roster + organisation for the tenant resolved from the request Host.
// For IER this returns exactly what it did before; other tenants get their own.
export async function GET(request: Request) {
  const tenant = resolveTenantFromRequest(request);
  return NextResponse.json({
    organization: tenant.organization,
    researchers: tenant.roster,
  });
}
