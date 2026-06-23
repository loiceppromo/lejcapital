import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const response = await updateSession(request);

  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  // Next's development runtime uses eval for developer diagnostics. Production
  // receives the CSP from this proxy and Vercel; development keeps the runtime
  // usable while production remains protected.
  if (process.env.NODE_ENV === 'production') {
    response.headers.set(
      'Content-Security-Policy',
      "default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.openai.com; media-src 'self';",
    );
  }
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=()',
  );
  if (!isPublicPath(request.nextUrl.pathname)) {
    response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, icon.png, apple-icon.png (browser icon files)
     * - brand/ (public brand assets)
     * - manifest.json (PWA manifest)
     * - api/health (unauthenticated health check)
     */
    '/((?!_next/static|_next/image|favicon\\.ico|icon\\.png|apple-icon\\.png|brand/|manifest\\.json|api/health).*)',
  ],
};

function isPublicPath(pathname: string) {
  return pathname === '/' || pathname === '/login' || pathname === '/auth/callback' || pathname === '/api/health';
}
