/**
 * ユーザーの連携アプリ管理画面
 */

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConnectedAppsList } from '@/components/dashboard/settings/ConnectedAppsList';

async function getUserConsents(userId: string) {
  const supabase = await createClient();
  
  const { data: consents, error } = await supabase
    .rpc('list_user_consents', { p_user_id: userId });

  if (error) {
    console.error('Failed to fetch user consents:', error);
    return [];
  }

  // RPCの返り値をUI用に整形
  return (consents || []).map((c: { id: string; application_id: string; application_name: string; scope: string; granted_at: string }) => ({
    id: c.id,
    scope: c.scope,
    granted_at: c.granted_at,
    application: {
      id: c.application_id,
      name: c.application_name,
    },
  }));
}

export default async function ConnectedAppsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const consents = await getUserConsents(user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">連携アプリ管理</h1>
        <p className="text-muted-foreground mt-2">
          あなたのSTEMアカウントと連携しているアプリケーションを管理します
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>連携中のアプリ</CardTitle>
          <CardDescription>
            これらのアプリはあなたのプロフィール情報にアクセスできます
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConnectedAppsList consents={consents} />
        </CardContent>
      </Card>
    </div>
  );
}
