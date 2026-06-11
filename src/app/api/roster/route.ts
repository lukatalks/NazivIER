import { NextResponse } from 'next/server';

import { IER_ORGANIZATION, IER_ROSTER_SEED } from '@/lib/sicris/roster';

// Pin to Frankfurt for consistency with the researcher route (closest region to
// Slovenia). The roster is static seed data, so this is just defensive parity.
export const preferredRegion = 'fra1';

export async function GET() {
  return NextResponse.json({
    organization: IER_ORGANIZATION,
    researchers: IER_ROSTER_SEED,
  });
}
