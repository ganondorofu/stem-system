/**
 * OAuth 2.0 Authorization Endpoint
 * GET /oauth/authorize
 * 
 * ユーザーに認可画面を表示し、同意を求める
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { isValidRedirectUri, redirectWithError, createOAuthError } from '@/lib/oauth';

export async function GET(request: Request) {
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
  
  if (authError || !user) {
    // 未ログインの場合はログイン画面へリダイレクト
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', request.url);
    redirect(loginUrl.toString());
  }

  // クライアントアプリケーションを検証（Service Role で取得）
  const { data: application, error: appError } = await supabase
    .from('oauth.applications')
    .select('*')
    .eq('client_id', clientId)
    .single();

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

  // 既に承認済みかチェック
  const { data: existingConsent } = await supabase
    .from('oauth.user_consents')
    .select('*')
    .eq('user_id', user.id)
    .eq('application_id', application.id)
    .single();

  // 承認画面にパラメータを渡す
  const consentUrl = new URL('/oauth/authorize/consent', request.url);
  consentUrl.searchParams.set('client_id', clientId);
  consentUrl.searchParams.set('redirect_uri', redirectUri);
  consentUrl.searchParams.set('state', state);
  consentUrl.searchParams.set('code_challenge', codeChallenge);
  consentUrl.searchParams.set('code_challenge_method', codeChallengeMethod);
  consentUrl.searchParams.set('scope', scope);
  consentUrl.searchParams.set('app_name', application.name);
  
  if (existingConsent) {
    consentUrl.searchParams.set('already_consented', 'true');
  }

  redirect(consentUrl.toString());
}
