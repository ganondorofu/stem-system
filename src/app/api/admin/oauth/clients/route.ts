/**
 * OAuth クライアント管理 API
 * POST: 新規クライアント作成
 */

import { createClient } from '@/lib/supabase/server';
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

  const supabase = await createClient();

  // RPC関数を使用してアプリケーションを作成
  const { data: application, error } = await supabase
    .rpc('create_application', {
      p_name: name,
      p_client_id: clientId,
      p_client_secret_hash: clientSecretHash,
      p_redirect_uris: redirect_uris,
      p_created_by: user.id,
    })
    .single();

  if (error) {
    console.error('Failed to create OAuth client:', error);
    console.error('DEBUG: Full error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Failed to create client' },
      { status: 500 }
    );
  }

  // クライアントシークレットは作成時のみ返す（平文）
  return NextResponse.json({
    ...application,
    client_secret: clientSecret, // 一度だけ表示
  });
}
