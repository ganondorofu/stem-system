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

  // ユーザーが拒否した場合
  if (action === 'deny') {
    const errorUrl = redirectWithError(
      redirectUri,
      createOAuthError('access_denied', 'User denied the request'),
      state
    );
    redirect(errorUrl);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // クライアントアプリケーションを取得
  const { data: application } = await supabase
    .from('oauth.applications')
    .select('*')
    .eq('client_id', clientId)
    .single();

  if (!application) {
    const errorUrl = redirectWithError(
      redirectUri,
      createOAuthError('invalid_client'),
      state
    );
    redirect(errorUrl);
  }

  // ユーザー承認を記録（既存の場合は更新）
  await supabase
    .from('oauth.user_consents')
    .upsert({
      user_id: user.id,
      application_id: application.id,
      scope,
    });

  // 認可コードを生成
  const code = generateRandomString(32);
  const expiresAt = getAuthCodeExpiry();

  // 認可コードをDBに保存
  const { error: codeError } = await supabase
    .from('oauth.authorization_codes')
    .insert({
      code,
      application_id: application.id,
      user_id: user.id,
      redirect_uri: redirectUri,
      code_challenge: codeChallenge,
      code_challenge_method: codeChallengeMethod,
      scope,
      expires_at: expiresAt.toISOString(),
    });

  if (codeError) {
    console.error('Failed to create authorization code:', codeError);
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

  redirect(callbackUrl.toString());
}
