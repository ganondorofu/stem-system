/**
 * OAuth 2.0 Token Endpoint
 * POST /oauth/token
 * 
 * 認可コードをアクセストークン（JWT）に交換
 */

import { createAdminClient } from '@/lib/supabase/server';
import {
  verifyClientSecret,
  verifyCodeChallenge,
  generateAccessToken,
  createOAuthError,
  TOKEN_EXPIRY,
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

  // トークンエンドポイントはサーバー間通信（Cookie なし）なので
  // RLS をバイパスする Admin クライアントを使用
  const supabase = await createAdminClient();

  // クライアント認証（RPC経由）
  const { data: applications, error: appError } = await supabase
    .rpc('get_application_by_client_id', { p_client_id: clientId });

  const application = applications?.[0];

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

  // 認可コードを取得（RPC経由）
  const { data: authCodes, error: codeError } = await supabase
    .rpc('get_authorization_code', { p_code: code });

  const authCode = authCodes?.[0];

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
    // 期限切れコードを削除（RPC経由）
    await supabase
      .rpc('delete_authorization_code', { p_code: code });

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

  // 使用済みコードを削除（RPC経由）
  // 注意: 認可コードの消費を検証後・トークン生成前に行うことで、
  // 同一コードによる並行リクエストでの二重トークン発行リスクを軽減する。
  // 理想的にはDB側で「取得と削除を原子的に行うRPC」を用意すべきだが、
  // 現状のアプリケーションレベルではこの順序が最善の緩和策。
  await supabase
    .rpc('delete_authorization_code', { p_code: code });

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

  // トークンレスポンスを返す（RFC 6749 §5.1 準拠ヘッダー付き）
  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: TOKEN_EXPIRY.ACCESS_TOKEN,
      scope: authCode.scope,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'Pragma': 'no-cache',
      },
    }
  );
}
