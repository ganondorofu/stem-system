import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  console.log('[Middleware] Request:', {
    pathname: request.nextUrl.pathname,
    headers: {
      host: request.headers.get('host'),
      'x-forwarded-host': request.headers.get('x-forwarded-host'),
    }
  });

  const { response, user } = await updateSession(request)

  console.log('[Middleware] User:', user ? `Authenticated (${user.id})` : 'Not authenticated');

  const isLoginPage = request.nextUrl.pathname === '/login'

  if (user && isLoginPage) {
    console.log('[Middleware] Authenticated user on login page, redirecting to dashboard');
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!user && !isLoginPage && request.nextUrl.pathname.startsWith('/dashboard')) {
    console.log('[Middleware] Unauthenticated user accessing dashboard, redirecting to login');
    return NextResponse.redirect(new URL('/login', request.url))
  }

  console.log('[Middleware] Allowing request to proceed');
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|auth/callback).*)',
  ],
}
