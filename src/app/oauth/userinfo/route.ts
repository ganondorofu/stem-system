/**
 * OAuth 2.0 UserInfo Endpoint
 * GET /oauth/userinfo
 * 
 * アクセストークンからユーザー情報を取得
 */

import { verifyAccessToken, createOAuthError } from '@/lib/oauth';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      createOAuthError('invalid_request', 'Missing or invalid Authorization header'),
      { status: 401 }
    );
  }

  const token = authHeader.substring(7); // "Bearer " を除去

  // JWT トークンを検証
  // clientId を渡さず audience チェックをスキップしている。
  // UserInfo エンドポイントは全 OAuth クライアント共通のリソースであり、
  // 有効なアクセストークンを持つ任意のクライアントがアクセスできるのが
  // OAuth 2.0 の標準的な動作（RFC 6750）のため、これは意図的な設計。
  const payload = verifyAccessToken(token);

  if (!payload) {
    return NextResponse.json(
      createOAuthError('invalid_token', 'Invalid or expired access token'),
      { status: 401 }
    );
  }

  // ユーザー情報を返す
  return NextResponse.json({
    sub: payload.sub,
    display_name: payload.display_name,
    discord_id: payload.discord_id,
    generation: payload.generation,
    status: payload.status,
  });
}
