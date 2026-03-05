import { createClient } from '@/lib/supabase/server';

export async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です。');

    const { data: admin } = await supabase
        .from('members')
        .select('is_admin')
        .eq('supabase_auth_user_id', user.id)
        .single();
    if (!admin?.is_admin) throw new Error('管理者権限が必要です。');
}
