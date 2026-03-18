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
    .from('user_consents')
    .select(`
      id,
      scope,
      granted_at,
      application:application_id (
        id,
        name,
        redirect_uris
      )
    `)
    .eq('user_id', userId)
    .order('granted_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch user consents:', error);
    return [];
  }

  return consents || [];
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
