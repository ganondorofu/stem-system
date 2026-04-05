/**
 * Server Action: OAuth Consent Handler
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  generateRandomString,
  getAuthCodeExpiry,
  redirectWithError,
  createOAuthError,
  isValidRedirectUri,
  validateScope,
} from '@/lib/oauth';

const consentFormSchema = z.object({
  action: z.enum(['approve', 'deny']),
  client_id: z.string().min(1),
  redirect_uri: z.string().url(),
  state: z.string(),
  code_challenge: z.string().min(1),
  code_challenge_method: z.literal('S256'),
  scope: z.string().min(1),
});

export async function handleConsent(formData: FormData) {
  const parsed = consentFormSchema.safeParse({
    action: formData.get('action'),
    client_id: formData.get('client_id'),
    redirect_uri: formData.get('redirect_uri'),
    state: formData.get('state'),
    code_challenge: formData.get('code_challenge'),
    code_challenge_method: formData.get('code_challenge_method'),
    scope: formData.get('scope'),
  });

  if (!parsed.success) {
    redirect('/login?error=invalid_request');
  }

  const { action, client_id: clientId, redirect_uri: redirectUri, state, code_challenge: codeChallenge, code_challenge_method: codeChallengeMethod, scope } = parsed.data;

  console.log('[OAuth Consent] Action:', action, 'clientId:', clientId, 'redirectUri:', redirectUri);

  let finalRedirectUrl: string;

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log('[OAuth Consent] getUser:', { hasUser: !!user, error: userError?.message });

    if (!user) {
      redirect('/login');
    }

    // クライアントアプリケーションを取得（RPC経由） — deny の前に取得して redirect_uri を検証
    const { data: applications, error: appError } = await supabase
      .rpc('get_application_by_client_id', { p_client_id: clientId });

    console.log('[OAuth Consent] getApp:', { found: !!applications?.[0], error: appError?.message });

    const application = applications?.[0];

    if (!application) {
      redirect('/login?error=invalid_client');
    }

    // redirect_uri が登録済みの許可リストに含まれているか検証
    const allowedUris: string[] = application.redirect_uris || [];
    if (!isValidRedirectUri(redirectUri, allowedUris)) {
      redirect('/login?error=invalid_redirect_uri');
    }

    // スコープを検証（許可されたスコープのみに制限）
    const validatedScope = validateScope(scope);

    // ユーザーが拒否した場合（アプリ検証後に処理）
    if (action === 'deny') {
      const errorUrl = redirectWithError(
        redirectUri,
        createOAuthError('access_denied', 'User denied the request'),
        state
      );
      redirect(errorUrl);
    }

    // ユーザー承認を記録（RPC経由）
    const { error: consentError } = await supabase
      .rpc('create_user_consent', {
        p_user_id: user.id,
        p_application_id: application.id,
        p_scope: validatedScope,
      });

    console.log('[OAuth Consent] createConsent:', { error: consentError?.message });

    // 認可コードを生成
    const code = generateRandomString(32);
    const expiresAt = getAuthCodeExpiry();

    // 認可コードをDBに保存（RPC経由）
    const { error: codeError } = await supabase
      .rpc('create_authorization_code', {
        p_code: code,
        p_application_id: application.id,
        p_user_id: user.id,
        p_redirect_uri: redirectUri,
        p_code_challenge: codeChallenge,
        p_code_challenge_method: codeChallengeMethod,
        p_scope: validatedScope,
        p_expires_at: expiresAt.toISOString(),
      });

    console.log('[OAuth Consent] createCode:', { error: codeError?.message });

    if (codeError) {
      console.error('[OAuth Consent] Failed to create authorization code:', codeError);
      const errorUrl = redirectWithError(
        redirectUri,
        createOAuthError('server_error', 'Failed to generate authorization code'),
        state
      );
      redirect(errorUrl);
    }

    // 認可コードをクライアントにリダイレクト
    const callbackUrl = new URL(redirectUri);
    callbackUrl.searchParams.set('code', code);
    callbackUrl.searchParams.set('state', state);
    finalRedirectUrl = callbackUrl.toString();

    console.log('[OAuth Consent] Redirecting to:', finalRedirectUrl);
  } catch (e) {
    // redirect() は内部的に特殊なエラーを throw するので、それは再 throw する
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') {
      throw e;
    }
    // Next.js の redirect は digest プロパティを持つ
    if (typeof e === 'object' && e !== null && 'digest' in e) {
      throw e;
    }
    console.error('[OAuth Consent] Unexpected error:', e);
    const errorUrl = redirectWithError(
      redirectUri,
      createOAuthError('server_error', 'Internal server error'),
      state
    );
    redirect(errorUrl);
  }

  redirect(finalRedirectUrl);
}
