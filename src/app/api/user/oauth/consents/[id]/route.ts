/**
 * ユーザーの連携解除 API
 * DELETE: 連携を解除
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  // 自分の承認記録のみ削除可能（RPC経由）
  const { data: deleted, error } = await supabase
    .rpc('delete_user_consent', { p_consent_id: id, p_user_id: user.id });

  if (error) {
    console.error('Failed to revoke consent:', error);
    return NextResponse.json(
      { error: 'Failed to revoke consent' },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
