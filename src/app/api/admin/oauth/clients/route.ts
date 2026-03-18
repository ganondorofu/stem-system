/**
 * OAuth クライアント管理 API
 * POST: 新規クライアント作成
 */

import { createClient, createOAuthClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateRandomString, hashClientSecret } from '@/lib/oauth';

export async function POST(request: Request) {
  const supabase = await createClient();
  
  // 管理者チェック
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: member } = await supabase
    .from('members')
    .select('is_admin')
    .eq('supabase_auth_user_id', user.id)
    .single();

  if (!member?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // リクエストボディを取得
  const body = await request.json();
  const { name, redirect_uris } = body;

  if (!name || !redirect_uris || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return NextResponse.json(
      { error: 'Invalid request: name and redirect_uris are required' },
      { status: 400 }
    );
  }

  // クライアントIDとシークレットを生成
  const clientId = generateRandomString(32);
  const clientSecret = generateRandomString(48);
  const clientSecretHash = await hashClientSecret(clientSecret);

  const supabaseOAuth = await createOAuthClient();
  
  // デバッグ: 環境変数の確認
  console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log('DEBUG: SUPABASE_SERVICE_ROLE_KEY length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);

  // DBに保存
  const { data: application, error } = await supabaseOAuth
    .schema('oauth').from('applications')
    .insert({
      name,
      client_id: clientId,
      client_secret_hash: clientSecretHash,
      redirect_uris,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('Failed to create OAuth client:', error);
    console.error('DEBUG: Full error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to create client', debug: { hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY } },
      { status: 500 }
    );
  }

  // クライアントシークレットは作成時のみ返す（平文）
  return NextResponse.json({
    ...application,
    client_secret: clientSecret, // 一度だけ表示
  });
}
