/**
 * 認証状態デバッグ用エンドポイント
 * GET /api/auth/debug
 *
 * Cookie の状態・セッション有無を確認するための一時的なエンドポイント。
 * 本番環境で問題を切り分けたら削除してよい。
 */
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const allCookies = request.cookies.getAll();
  const cookieNames = allCookies.map(c => c.name);

  // Supabase セッション cookie の存在を確認（値は返さない）
  const supabaseCookies = cookieNames.filter(n =>
    n.startsWith('sb-') && n.includes('auth-token')
  );

  let userResult: { hasUser: boolean; userId?: string; error?: string } = {
    hasUser: false,
  };

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    userResult = {
      hasUser: !!user,
      userId: user?.id,
      error: error?.message,
    };
  } catch (e) {
    userResult = {
      hasUser: false,
      error: `Exception: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    cookies: {
      total: cookieNames.length,
      names: cookieNames,
      supabaseAuthCookies: supabaseCookies,
      hasOauthRedirect: cookieNames.includes('oauth_redirect'),
      hasOauthRedirectClient: cookieNames.includes('oauth_redirect_client'),
    },
    auth: userResult,
    request: {
      url: request.url,
      forwardedHost: request.headers.get('x-forwarded-host'),
      forwardedProto: request.headers.get('x-forwarded-proto'),
      host: request.headers.get('host'),
    },
  });
}
