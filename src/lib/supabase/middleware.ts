import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * セッションCookieをリダイレクトレスポンスにコピーする。
 * getUser() がトークンをリフレッシュした場合、新しいCookieをリダイレクトにも
 * 含めないと、ブラウザが古い（消費済みの）リフレッシュトークンで次のリクエストを
 * 送り、セッションが無効になる。
 */
function copySessionCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie.name, cookie.value)
  })
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // リクエストCookieにも書き込む（下流のRoute Handlerに伝播するため）
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 公開パス（認証不要）
  const isPublicPath = request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/auth/callback')
    || request.nextUrl.pathname.startsWith('/oauth')
    || request.nextUrl.pathname.startsWith('/api');

  // ログインしていないユーザーが保護されたページにアクセスした場合、ログインページにリダイレクト
  if (!user && !isPublicPath) {
    const loginRedirect = NextResponse.redirect(new URL('/login', request.url))
    copySessionCookies(supabaseResponse, loginRedirect)
    return loginRedirect
  }

  // ログインしているユーザーがログインページにアクセスした場合
  if (user && request.nextUrl.pathname.startsWith('/login')) {
    const redirectParam = request.nextUrl.searchParams.get('redirect');
    if (redirectParam) {
      // OAuth フローからのリダイレクト：同一オリジンの /oauth/ パスのみ許可
      try {
        const redirectUrl = new URL(redirectParam);
        const requestOrigin = new URL(request.url).origin;
        if (redirectUrl.origin === requestOrigin && redirectUrl.pathname.startsWith('/oauth/')) {
          const oauthRedirect = NextResponse.redirect(redirectUrl);
          copySessionCookies(supabaseResponse, oauthRedirect)
          return oauthRedirect;
        }
      } catch {
        // 不正なURLの場合はダッシュボードへ
      }
    }
    const dashRedirect = NextResponse.redirect(new URL('/dashboard', request.url))
    copySessionCookies(supabaseResponse, dashRedirect)
    return dashRedirect
  }

  return supabaseResponse
}
