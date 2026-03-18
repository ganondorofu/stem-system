/**
 * OAuth クライアントアプリケーション管理画面
 * 管理者のみアクセス可能
 */

import { createClient, createAdminClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OAuthClientList } from '@/components/dashboard/admin/OAuthClientList';
import { OAuthClientForm } from '@/components/dashboard/admin/OAuthClientForm';

async function getOAuthClients() {
  const supabaseAdmin = await createAdminClient();
  
  const { data: applications, error } = await supabaseAdmin
    .from('oauth.applications')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch OAuth applications:', error);
    return [];
  }

  return applications || [];
}

export default async function OAuthAdminPage() {
  const supabase = await createClient();
  
  // 管理者チェック
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect('/login');
  }

  const { data: member } = await supabase
    .from('members')
    .select('is_admin')
    .eq('supabase_auth_user_id', user.id)
    .single();

  if (!member?.is_admin) {
    redirect('/dashboard');
  }

  const applications = await getOAuthClients();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">OAuth クライアント管理</h1>
        <p className="text-muted-foreground mt-2">
          他のアプリケーションがSTEMシステムと連携するためのOAuthクライアントを管理します
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>新規クライアント登録</CardTitle>
          <CardDescription>
            kintai-v3などの外部アプリケーションを登録します
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OAuthClientForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>登録済みクライアント</CardTitle>
          <CardDescription>
            登録されているOAuthクライアントアプリケーションの一覧
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OAuthClientList applications={applications} />
        </CardContent>
      </Card>
    </div>
  );
}
