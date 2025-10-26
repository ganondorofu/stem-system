import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  // Get the actual origin from request headers (for proxy support)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost || request.headers.get('host') || 'localhost:9002';
  const protocol = forwardedProto || 'http';
  const origin = `${protocol}://${host}`;

  // Get request headers for debugging
  const headers = {
    host: request.headers.get('host'),
    'x-forwarded-for': request.headers.get('x-forwarded-for'),
    'x-forwarded-proto': forwardedProto,
    'x-forwarded-host': forwardedHost,
  };

  console.log('[Auth Callback] Received request:', {
    code: code ? 'present' : 'missing',
    next,
    origin,
    url: request.url,
    headers,
  })

  if (code) {
    const supabase = await createClient()
    
    // Check if user is already authenticated
    const { data: { session: existingSession } } = await supabase.auth.getSession()
    
    if (existingSession) {
      // User is already authenticated, redirect immediately
      console.log('[Auth Callback] User already authenticated, skipping exchange')
      const redirectUrl = `${origin}${next}`
      const redirectResponse = NextResponse.redirect(redirectUrl, { status: 303 })
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      return redirectResponse
    }
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('[Auth Callback] Exchange result:', {
      success: !error,
      error: error?.message,
      hasSession: !!data?.session,
      userId: data?.user?.id
    })

    if (!error) {
      const redirectUrl = `${origin}${next}`
      console.log('[Auth Callback] Redirecting to:', redirectUrl)
      
      // Create redirect response with proper headers
      const redirectResponse = NextResponse.redirect(redirectUrl, {
        status: 303, // Use 303 See Other to prevent POST->GET issues
      })
      
      // Prevent caching of this redirect
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      redirectResponse.headers.set('Pragma', 'no-cache')
      redirectResponse.headers.set('Expires', '0')
      
      return redirectResponse
    }
    
    console.error('[Auth Callback] Error exchanging code:', error)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  // return the user to an error page with instructions
  console.log('[Auth Callback] No code provided')
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
