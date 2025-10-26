import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const { user, response } = await updateSession(request)
  const url = request.nextUrl.clone()

  if (user && url.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  if (!user && url.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}
