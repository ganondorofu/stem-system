/**
 * OAuth 2.0 ユーティリティ関数
 * JWT トークンの生成・検証、PKCE、ランダム文字列生成など
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// 環境変数から JWT シークレットキーを取得（必須）
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required. Set it before starting the server.');
}
const JWT_ISSUER = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// トークン有効期限
export const TOKEN_EXPIRY = {
  ACCESS_TOKEN: 60 * 60 * 24 * 30, // 30日（秒）
  AUTHORIZATION_CODE: 60 * 10, // 10分（秒）
};

/**
 * ランダムな文字列を生成（client_id, client_secret, codeなど）
 */
export function generateRandomString(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Client Secret をハッシュ化
 */
export async function hashClientSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, 10);
}

/**
 * Client Secret を検証
 */
export async function verifyClientSecret(
  secret: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}

/**
 * PKCE code_challenge を検証
 */
export function verifyCodeChallenge(
  verifier: string,
  challenge: string,
  method: string = 'S256'
): boolean {
  if (method !== 'S256') {
    return false;
  }

  const hash = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');

  return hash === challenge;
}

/**
 * JWT アクセストークンを生成
 */
export interface JWTPayload {
  sub: string; // user_id
  display_name: string;
  discord_id: string;
  generation: number;
  status: number;
  scope: string;
}

export function generateAccessToken(
  payload: JWTPayload,
  clientId: string
): string {
  const now = Math.floor(Date.now() / 1000);

  return jwt.sign(
    {
      ...payload,
      iss: JWT_ISSUER,
      aud: clientId,
      iat: now,
      exp: now + TOKEN_EXPIRY.ACCESS_TOKEN,
    },
    JWT_SECRET,
    { algorithm: 'HS256' }
  );
}

/**
 * JWT アクセストークンを検証・デコード
 */
export function verifyAccessToken(token: string, clientId?: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: clientId,
    }) as JWTPayload & { iat: number; exp: number; iss: string; aud: string };

    return {
      sub: decoded.sub,
      display_name: decoded.display_name,
      discord_id: decoded.discord_id,
      generation: decoded.generation,
      status: decoded.status,
      scope: decoded.scope,
    };
  } catch (error) {
    console.error('Token verification failed:', error);
    return null;
  }
}

/**
 * Authorization Code の有効期限を計算
 */
export function getAuthCodeExpiry(): Date {
  return new Date(Date.now() + TOKEN_EXPIRY.AUTHORIZATION_CODE * 1000);
}

/**
 * リダイレクトURIが許可リストに含まれているか検証
 */
export function isValidRedirectUri(
  redirectUri: string,
  allowedUris: string[]
): boolean {
  return allowedUris.includes(redirectUri);
}

/**
 * OAuth エラーレスポンスを構築
 */
export interface OAuthError {
  error: string;
  error_description?: string;
}

export function createOAuthError(
  error: string,
  description?: string
): OAuthError {
  const result: OAuthError = { error };
  if (description) {
    result.error_description = description;
  }
  return result;
}

/**
 * エラーをリダイレクトURIに付加
 */
export function redirectWithError(
  redirectUri: string,
  error: OAuthError,
  state?: string
): string {
  const url = new URL(redirectUri);
  url.searchParams.set('error', error.error);
  if (error.error_description) {
    url.searchParams.set('error_description', error.error_description);
  }
  if (state) {
    url.searchParams.set('state', state);
  }
  return url.toString();
}
