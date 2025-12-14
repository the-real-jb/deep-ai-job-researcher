import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authPassword = process.env.AUTH_PASSWORD;
  
  // Check for API keys to determine security requirements
  // Note: middleware runs on Edge, so ensure these env vars are available
  const hasOpenAI = !!process.env.OPENAI_API_KEY;
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;
  const hasGoogle = !!process.env.GOOGLE_AI_API_KEY || !!process.env.GEMINI_API_KEY;
  
  const hasPaidKey = hasOpenAI || hasAnthropic;
  
  // Paths that don't require auth
  const publicPaths = ['/login', '/api/auth/login', '/favicon.ico'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));
  const isStaticAsset = request.nextUrl.pathname.match(/\.(css|js|png|jpg|jpeg|svg|ico)$/);

  // Always allow public paths and static assets
  if (isPublicPath || isStaticAsset) {
    // If authenticated and trying to visit login, redirect to home
    const token = request.cookies.get('auth_token');
    if (token?.value === 'authenticated' && request.nextUrl.pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  // --- Auth Logic ---

  // 1. If Password is set -> Enforce Auth
  if (authPassword) {
    const token = request.cookies.get('auth_token');
    const isAuthenticated = token?.value === 'authenticated';

    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 2. If Password is NOT set, check for Paid Keys
  if (hasPaidKey) {
    // Paid keys present but no password set -> Security Risk!
    // Block access to prevent unauthorized usage of paid credits.
    return new NextResponse(
      JSON.stringify({
        error: 'Configuration Error: Paid AI API keys detected but no AUTH_PASSWORD set. Please set AUTH_PASSWORD in your environment variables to secure your paid credits.',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 3. If only Free Key (Google) or no keys -> Allow access (Free Tier Mode)
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
