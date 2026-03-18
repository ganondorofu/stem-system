import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          supabaseResponse.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const url = request.nextUrl.clone()

  // 公開パス（認証不要）
  const isPublicPath = request.nextUrl.pathname.startsWith('/login')
    || request.nextUrl.pathname.startsWith('/auth/callback')
    || request.nextUrl.pathname.startsWith('/oauth')
    || request.nextUrl.pathname.startsWith('/api');

  // ログインしていないユーザーが保護されたページにアクセスした場合、ログインページにリダイレクト
  if (!user && !isPublicPath) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  // ログインしているユーザーがログインページにアクセスした場合（OAuthリダイレクトでない場合のみ）
  if(user && request.nextUrl.pathname.startsWith('/login') && !request.nextUrl.searchParams.has('redirect')){
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }


  return supabaseResponse
}
