/**
 * OAuth クライアント削除 API
 * DELETE: クライアント削除
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;

  // RPC関数を使用してクライアントを削除
  const { data: deleted, error } = await supabase
    .rpc('delete_application', { p_id: id });

  if (error || !deleted) {
    console.error('Failed to delete OAuth client:', error);
    return NextResponse.json(
      { error: 'Failed to delete client' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
