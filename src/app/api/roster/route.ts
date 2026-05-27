import { NextResponse } from 'next/server';

import { IER_ORGANIZATION, IER_ROSTER_SEED } from '@/lib/sicris/roster';

export async function GET() {
  return NextResponse.json({
    organization: IER_ORGANIZATION,
    researchers: IER_ROSTER_SEED,
  });
}
