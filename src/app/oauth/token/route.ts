/**
 * OAuth 2.0 Token Endpoint
 * POST /oauth/token
 * 
 * 認可コードをアクセストークン（JWT）に交換
 */

import { createClient } from '@/lib/supabase/server';
import {
  verifyClientSecret,
  verifyCodeChallenge,
  generateAccessToken,
  createOAuthError,
} from '@/lib/oauth';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const formData = await request.formData();
  
  const grantType = formData.get('grant_type') as string;
  const code = formData.get('code') as string;
  const redirectUri = formData.get('redirect_uri') as string;
  const clientId = formData.get('client_id') as string;
  const clientSecret = formData.get('client_secret') as string;
  const codeVerifier = formData.get('code_verifier') as string;

  // grant_type のバリデーション
  if (grantType !== 'authorization_code') {
    return NextResponse.json(
      createOAuthError('unsupported_grant_type'),
      { status: 400 }
    );
  }

  // 必須パラメータのチェック
  if (!code || !redirectUri || !clientId || !clientSecret || !codeVerifier) {
    return NextResponse.json(
      createOAuthError('invalid_request', 'Missing required parameters'),
      { status: 400 }
    );
  }

  const supabase = await createClient();

  // クライアント認証
  const { data: application, error: appError } = await supabase
    .from('applications')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (appError || !application) {
    return NextResponse.json(
      createOAuthError('invalid_client'),
      { status: 401 }
    );
  }

  // クライアントシークレットの検証
  const isValidSecret = await verifyClientSecret(clientSecret, application.client_secret_hash);
  if (!isValidSecret) {
    return NextResponse.json(
      createOAuthError('invalid_client', 'Invalid client credentials'),
      { status: 401 }
    );
  }

  // 認可コードを取得
  const { data: authCode, error: codeError } = await supabase
    .from('authorization_codes')
    .select('*')
    .eq('code', code)
    .single();

  if (codeError || !authCode) {
    return NextResponse.json(
      createOAuthError('invalid_grant', 'Invalid or expired authorization code'),
      { status: 400 }
    );
  }

  // 認可コードの検証
  if (authCode.application_id !== application.id) {
    return NextResponse.json(
      createOAuthError('invalid_grant', 'Code was issued to different client'),
      { status: 400 }
    );
  }

  if (authCode.redirect_uri !== redirectUri) {
    return NextResponse.json(
      createOAuthError('invalid_grant', 'Redirect URI mismatch'),
      { status: 400 }
    );
  }

  // 有効期限チェック
  if (new Date(authCode.expires_at) < new Date()) {
    // 期限切れコードを削除
    await supabase
      .from('authorization_codes')
      .delete()
      .eq('code', code);

    return NextResponse.json(
      createOAuthError('invalid_grant', 'Authorization code expired'),
      { status: 400 }
    );
  }

  // PKCE 検証
  const isPKCEValid = verifyCodeChallenge(
    codeVerifier,
    authCode.code_challenge,
    authCode.code_challenge_method
  );

  if (!isPKCEValid) {
    return NextResponse.json(
      createOAuthError('invalid_grant', 'PKCE verification failed'),
      { status: 400 }
    );
  }

  // ユーザー情報を取得
  const { data: member } = await supabase
    .from('members')
    .select('*')
    .eq('supabase_auth_user_id', authCode.user_id)
    .single();

  if (!member) {
    return NextResponse.json(
      createOAuthError('server_error', 'User not found'),
      { status: 500 }
    );
  }

  // JWT アクセストークンを生成
  const accessToken = generateAccessToken(
    {
      sub: authCode.user_id,
      display_name: member.display_name,
      discord_id: member.discord_id,
      generation: member.generation,
      status: member.status,
      scope: authCode.scope,
    },
    clientId
  );

  // 使用済みコードを削除
  await supabase
    .from('authorization_codes')
    .delete()
    .eq('code', code);

  // トークンレスポンスを返す
  return NextResponse.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 3600, // 1時間
    scope: authCode.scope,
  });
}
