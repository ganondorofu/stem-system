import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  
  // OAuth リダイレクト先をCookieから取得（authorize routeが設定）
  const oauthRedirectCookie = request.cookies.get('oauth_redirect')?.value;
  const nextParam = searchParams.get('next');
  const next = oauthRedirectCookie || nextParam || '/dashboard';

  // Get the actual origin from request headers (for proxy support)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost || request.headers.get('host') || 'localhost:9002';
  const protocol = forwardedProto || 'http';
  const origin = `${protocol}://${host}`;

  // nextが絶対URLかどうか判定
  const isAbsoluteUrl = next.startsWith('http://') || next.startsWith('https://');
  const redirectUrl = isAbsoluteUrl ? next : `${origin}${next}`;

  console.log('[Auth Callback] Request:', {
    code: code ? 'present' : 'missing',
    oauthRedirectCookie: oauthRedirectCookie ? 'present' : 'missing',
    resolvedNext: next,
    redirectUrl,
  })

  if (code) {
    // Cookieを収集するためにカスタムSupabaseクライアントを作成
    // （NextResponse.redirect()にCookieを直接設定するため）
    const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            pendingCookies.push(...cookiesToSet);
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('[Auth Callback] Exchange:', {
      success: !error,
      error: error?.message,
      userId: data?.user?.id,
      pendingCookies: pendingCookies.length,
    })

    if (!error) {
      console.log('[Auth Callback] Redirecting to:', redirectUrl)
      const redirectResponse = NextResponse.redirect(redirectUrl, { status: 303 })
      redirectResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
      
      // Supabaseのセッションcookieをリダイレクトレスポンスに設定
      pendingCookies.forEach(({ name, value, options }) => {
        redirectResponse.cookies.set(name, value, options as any)
      })
      
      // oauth_redirect Cookieをクリア
      if (oauthRedirectCookie) {
        redirectResponse.cookies.delete('oauth_redirect');
      }
      return redirectResponse
    }
    
    console.error('[Auth Callback] Error:', error)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  console.log('[Auth Callback] No code provided')
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
