import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')

  // Get the actual origin from request headers (for proxy support)
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const host = forwardedHost || request.headers.get('host') || 'localhost:9002';
  const protocol = forwardedProto || 'http';
  const origin = `${protocol}://${host}`;

  // OAuth リダイレクト先を複数ソースから取得（優先順位順）
  // 1. httpOnly Cookie（サーバー側で設定、最も安全）
  // 2. next query parameter（Supabase redirectTo 経由）
  // 3. クライアント側 Cookie（login ページで設定、フォールバック）
  // 4. デフォルト: /dashboard
  const oauthRedirectCookie = request.cookies.get('oauth_redirect')?.value;
  const oauthRedirectClient = request.cookies.get('oauth_redirect_client')?.value
    ? decodeURIComponent(request.cookies.get('oauth_redirect_client')!.value)
    : undefined;
  let nextParam = searchParams.get('next');

  // oauthRedirectCookie はパス（/oauth/authorize?...）で保存されている
  // 絶対URLの場合はパス+クエリのみ抽出（セキュリティ対策）
  let oauthRedirectPath: string | undefined;
  if (oauthRedirectCookie) {
    try {
      // 絶対URLかチェック
      const parsed = new URL(oauthRedirectCookie);
      oauthRedirectPath = `${parsed.pathname}${parsed.search}`;
    } catch {
      // 相対パスの場合はそのまま使用
      oauthRedirectPath = oauthRedirectCookie;
    }
  }

  // query parameterのnextが絶対URLの場合、パス+クエリのみ抽出
  if (nextParam) {
    try {
      const nextUrl = new URL(nextParam);
      nextParam = `${nextUrl.pathname}${nextUrl.search}`;
    } catch {
      // 相対パスの場合はそのまま
    }
  }

  // クライアント側 Cookie も同様にパス+クエリのみ抽出
  let clientRedirectPath: string | undefined;
  if (oauthRedirectClient) {
    try {
      const clientUrl = new URL(oauthRedirectClient);
      clientRedirectPath = `${clientUrl.pathname}${clientUrl.search}`;
    } catch {
      // 相対パスの場合はそのまま
      clientRedirectPath = oauthRedirectClient;
    }
  }

  const next = oauthRedirectPath || nextParam || clientRedirectPath || '/dashboard';
  // セキュリティ: 相対パスのみ許可（origin 付加で絶対URLにする）
  const redirectUrl = next.startsWith('/') ? `${origin}${next}` : `${origin}/dashboard`;

  console.log('[Auth Callback] Debug:', JSON.stringify({
    httpOnlyCookie: oauthRedirectCookie ? `found(${oauthRedirectCookie.substring(0, 50)}...)` : 'missing',
    clientCookie: oauthRedirectClient ? 'found' : 'missing',
    nextParam: nextParam ? `found(${nextParam.substring(0, 50)}...)` : 'missing',
    resolvedNext: next.substring(0, 80),
    code: code ? 'present' : 'missing',
    allCookieNames: request.cookies.getAll().map(c => c.name).join(','),
  }))

  if (code) {
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
      if (oauthRedirectClient) {
        redirectResponse.cookies.delete('oauth_redirect_client');
      }
      return redirectResponse
    }

    console.error('[Auth Callback] Error:', error)
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`)
  }

  console.log('[Auth Callback] No code provided')
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
