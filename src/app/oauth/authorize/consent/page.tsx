/**
 * OAuth 2.0 Authorization Consent Page
 * ユーザーに連携の承認を求める画面
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConsentForm } from './consent-form';

export default async function ConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>;
}) {
  const params = await searchParams;
  const clientId = params.client_id;
  const redirectUri = params.redirect_uri;
  const state = params.state;
  const codeChallenge = params.code_challenge;
  const codeChallengeMethod = params.code_challenge_method;
  const scope = params.scope || 'openid profile';
  const appName = params.app_name || 'Unknown App';
  const alreadyConsented = params.already_consented === 'true';

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // ユーザー情報を取得
  const { data: member } = await supabase
    .from('members')
    .select('discord_username')
    .eq('supabase_auth_user_id', user.id)
    .single();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>アプリ連携の承認</CardTitle>
          <CardDescription>
            {appName} があなたのSTEMアカウントへのアクセスを要求しています
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">ログイン中のユーザー</p>
            <p className="text-sm text-muted-foreground">
              {member?.discord_username || user.email}
            </p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">このアプリに以下の情報へのアクセスを許可します：</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>ユーザーID</li>
              <li>表示名</li>
              <li>Discord ID</li>
              <li>代（generation）</li>
              <li>ステータス（中等部/高等部/OB）</li>
            </ul>
          </div>

          {alreadyConsented && (
            <p className="text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 p-2 rounded">
              このアプリは既に承認済みです
            </p>
          )}

          <ConsentForm
            clientId={clientId!}
            redirectUri={redirectUri!}
            state={state!}
            codeChallenge={codeChallenge!}
            codeChallengeMethod={codeChallengeMethod!}
            scope={scope}
          />
        </CardContent>
      </Card>
    </div>
  );
}
