/**
 * Server Action: OAuth Consent Handler
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import {
  generateRandomString,
  getAuthCodeExpiry,
  redirectWithError,
  createOAuthError,
} from '@/lib/oauth';

export async function handleConsent(formData: FormData) {
  const action = formData.get('action') as string;
  const clientId = formData.get('client_id') as string;
  const redirectUri = formData.get('redirect_uri') as string;
  const state = formData.get('state') as string;
  const codeChallenge = formData.get('code_challenge') as string;
  const codeChallengeMethod = formData.get('code_challenge_method') as string;
  const scope = formData.get('scope') as string;

  console.log('[OAuth Consent] Action:', action, 'clientId:', clientId, 'redirectUri:', redirectUri);

  // ユーザーが拒否した場合
  if (action === 'deny') {
    const errorUrl = redirectWithError(
      redirectUri,
      createOAuthError('access_denied', 'User denied the request'),
      state
    );
    redirect(errorUrl);
  }

  let finalRedirectUrl: string;

  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    console.log('[OAuth Consent] getUser:', { hasUser: !!user, error: userError?.message });

    if (!user) {
      redirect('/login');
    }

    // クライアントアプリケーションを取得（RPC経由）
    const { data: applications, error: appError } = await supabase
      .rpc('get_application_by_client_id', { p_client_id: clientId });

    console.log('[OAuth Consent] getApp:', { found: !!applications?.[0], error: appError?.message });

    const application = applications?.[0];

    if (!application) {
      const errorUrl = redirectWithError(
        redirectUri,
        createOAuthError('invalid_client'),
        state
      );
      redirect(errorUrl);
    }

    // ユーザー承認を記録（RPC経由）
    const { error: consentError } = await supabase
      .rpc('create_user_consent', {
        p_user_id: user.id,
        p_application_id: application.id,
        p_scope: scope,
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
        p_scope: scope,
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
