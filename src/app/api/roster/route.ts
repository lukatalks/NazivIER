import { NextResponse } from 'next/server';

import { INSTITUTE } from '@/lib/institute';

// Pin to Frankfurt for consistency with the researcher route (closest region to
// Slovenia). The roster is static seed data, so this is just defensive parity.
export const preferredRegion = 'fra1';

// Serves this build's institute roster + organisation.
export async function GET() {
  return NextResponse.json({
    organization: INSTITUTE.organization,
    researchers: INSTITUTE.roster,
  });
}
