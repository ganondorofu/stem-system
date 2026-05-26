/**
 * OAuth 2.0 Authorization Endpoint
 * GET /oauth/authorize
 * 
 * ユーザーに認可画面を表示し、同意を求める
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { isValidRedirectUri, createOAuthError, generateRandomString, getAuthCodeExpiry } from '@/lib/oauth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // OAuth パラメータを取得
  const clientId = searchParams.get('client_id');
  const redirectUri = searchParams.get('redirect_uri');
  const state = searchParams.get('state');
  const codeChallenge = searchParams.get('code_challenge');
  const codeChallengeMethod = searchParams.get('code_challenge_method');
  const responseType = searchParams.get('response_type');
  const scope = searchParams.get('scope') || 'openid profile';

  // 必須パラメータのバリデーション
  if (!clientId || !redirectUri || !codeChallenge || !state) {
    return new Response(
      JSON.stringify(createOAuthError('invalid_request', 'Missing required parameters')),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (responseType !== 'code') {
    return new Response(
      JSON.stringify(createOAuthError('unsupported_response_type', 'Only "code" is supported')),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (codeChallengeMethod !== 'S256') {
    return new Response(
      JSON.stringify(createOAuthError('invalid_request', 'Only S256 code_challenge_method is supported')),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const supabase = await createClient();

  // ユーザーのログイン状態を確認
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  console.log('[OAuth Authorize] getUser:', {
    hasUser: !!user,
    error: authError?.message,
  });

  if (authError || !user) {
    // 未ログインの場合：ログイン画面へリダイレクト
    // リダイレクト先をパス+クエリで保存（内部URLの漏洩を防止）
    const requestUrl = new URL(request.url);
    const oauthPath = `${requestUrl.pathname}${requestUrl.search}`;

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.url);
    const response = NextResponse.redirect(loginUrl, { status: 307 });
    // httpOnly Cookie にパスを保存（auth callback で読み取り）
    response.cookies.set('oauth_redirect', oauthPath, {
      httpOnly: true,
      secure: request.url.startsWith('https'),
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
    console.log('[OAuth Authorize] Redirecting unauthenticated user to login');
    return response;
  }

  // 部員登録が完了しているか確認
  const adminSupabase = await createAdminClient();
  const { data: memberProfile } = await adminSupabase
    .from('members')
    .select('supabase_auth_user_id')
    .eq('supabase_auth_user_id', user.id)
    .is('deleted_at', null)
    .single();

  if (!memberProfile) {
    // 未登録ユーザーは登録ページへ。OAuth redirect を cookie に保存して登録後に戻れるようにする。
    const requestUrl = new URL(request.url);
    const oauthPath = `${requestUrl.pathname}${requestUrl.search}`;
    const registerUrl = new URL('/dashboard/register', request.url);
    const response = NextResponse.redirect(registerUrl, { status: 307 });
    response.cookies.set('oauth_redirect', oauthPath, {
      httpOnly: true,
      secure: request.url.startsWith('https'),
      sameSite: 'lax',
      maxAge: 600,
      path: '/',
    });
    console.log('[OAuth Authorize] Member not registered, redirecting to /dashboard/register');
    return response;
  }

  // クライアントアプリケーションを検証（RPC経由）
  const { data: applications, error: appError } = await supabase
    .rpc('get_application_by_client_id', { p_client_id: clientId });

  const application = applications?.[0];

  if (appError || !application) {
    return new Response(
      JSON.stringify(createOAuthError('invalid_client', 'Unknown client_id')),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // リダイレクトURIを検証
  if (!isValidRedirectUri(redirectUri, application.redirect_uris)) {
    return new Response(
      JSON.stringify(createOAuthError('invalid_request', 'Invalid redirect_uri')),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // 既に承認済みかチェック（RPC経由）
  const { data: hasConsent } = await supabase
    .rpc('check_user_consent', { p_user_id: user.id, p_application_id: application.id });

  const existingConsent = hasConsent;

  // 既に承認済みなら認可コードを直発行してリダイレクト
  if (existingConsent) {
    const code = generateRandomString(32);
    const expiresAt = getAuthCodeExpiry();

    const { error: codeError } = await supabase
      .rpc('create_authorization_code', {
        p_code: code,
        p_application_id: application.id,
        p_user_id: user.id,
        p_redirect_uri: redirectUri,
        p_code_challenge: codeChallenge,
        p_code_challenge_method: codeChallengeMethod,
        p_scope: scope,
        p_expires_at: expiresAt.toISOString(),
      });

    if (codeError) {
      return new Response(
        JSON.stringify(createOAuthError('server_error', 'Failed to generate authorization code')),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('state', state);
    return NextResponse.redirect(callbackUrl.toString(), { status: 302 });
  }

  // 未承認：同意画面へ
  const consentUrl = new URL('/oauth/authorize/consent', request.url);
  consentUrl.searchParams.set('client_id', clientId);
  consentUrl.searchParams.set('redirect_uri', redirectUri);
  consentUrl.searchParams.set('state', state);
  consentUrl.searchParams.set('code_challenge', codeChallenge);
  consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
  consentUrl.searchParams.set('scope', scope);
  consentUrl.searchParams.set('app_name', application.name);

  return NextResponse.redirect(consentUrl, { status: 307 });
}
