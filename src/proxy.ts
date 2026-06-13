import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';

import { routing } from './i18n/routing';
import { INSTITUTE } from './lib/institute';

const intlMiddleware = createMiddleware(routing);

// Optional per-build access gate (white-label). For the IER demo `access.mode` is
// 'open', so this is a pure pass-through and nazivier.vercel.app is unaffected.
// A sold build sets mode 'password' and provides HABILIS_ACCESS_PASSWORDS
// (comma-separated allow-list). SSO is a future option (proxy to the institute's
// IdP); Vercel deployment-password protection needs no code at all.

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${INSTITUTE.brand.productName}", charset="UTF-8"`,
    },
  });
}

function passwordOk(request: NextRequest): boolean {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Basic ')) return false;
  let decoded = '';
  try {
    decoded = atob(header.slice(6));
  } catch {
    return false;
  }
  const password = decoded.slice(decoded.indexOf(':') + 1);
  const allowed = (process.env.HABILIS_ACCESS_PASSWORDS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return allowed.length > 0 && allowed.includes(password);
}

export default function middleware(request: NextRequest): NextResponse {
  if (INSTITUTE.access.mode === 'password' && !passwordOk(request)) {
    return unauthorized();
  }
  return intlMiddleware(request) as NextResponse;
}

export const config = {
  // Match everything except internal paths, API, static files
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
