"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { redirect } from 'next/navigation';

const profileSchema = z.object({
    generation: z.coerce.number().int().min(0, '期は0以上の数字である必要があります。'),
    student_number: z.string().optional().nullable(),
    status: z.coerce.number().int().min(0).max(2),
});

const registerSchema = z.object({
    generation: z.coerce.number().int().min(1, '期は正の整数である必要があります。'),
    student_number: z.string().optional().nullable(),
    status: z.coerce.number().int().min(0).max(1),
});

export async function registerNewMember(values: z.infer<typeof registerSchema>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: '登録するにはログインする必要があります。' };
    }
     const { data: existingMember } = await supabase
        .from('members')
        .select('supabase_auth_user_id')
        .eq('supabase_auth_user_id', user.id)
        .single();

    if (existingMember) {
        return { error: 'このユーザーは既に登録済みです。' };
    }

    const parsedData = registerSchema.safeParse(values);
    if (!parsedData.success) {
        return { error: '無効なデータが提供されました。' };
    }

    const { error } = await supabase.from('members').insert({
        supabase_auth_user_id: user.id,
        discord_uid: user.user_metadata.provider_id,
        avatar_url: user.user_metadata.avatar_url,
        is_admin: false, // New members are never admins
        ...parsedData.data,
    });

    if (error) {
        console.error('Error creating member profile:', error);
        return { error: '部員情報の作成に失敗しました。' };
    }

    revalidatePath('/dashboard', 'layout');
    return { error: null };
}


export async function updateMyProfile(values: z.infer<typeof profileSchema>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'プロフィールを更新するにはログインする必要があります。' };
    }

    const parsedData = profileSchema.safeParse(values);
    if (!parsedData.success) {
        return { error: '無効なデータが提供されました。' };
    }

    const { error } = await supabase
        .from('members')
        .update({
            generation: parsedData.data.generation,
            student_number: parsedData.data.student_number,
            status: parsedData.data.status,
        })
        .eq('supabase_auth_user_id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
        return { error: 'プロフィールの更新に失敗しました。もう一度お試しください。' };
    }

    revalidatePath('/dashboard', 'layout');
    return { error: null };
}

export async function updateMemberAdmin(userId: string, values: z.infer<typeof profileSchema>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: '認証が必要です。' };
    }

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) {
        return { error: '管理者権限が必要です。' };
    }

    const { error } = await supabase
        .from('members')
        .update(values)
        .eq('supabase_auth_user_id', userId);

    if (error) {
        console.error('Error updating member by admin:', error);
        return { error: 'メンバーの更新に失敗しました。' };
    }

    revalidatePath('/dashboard/admin/members');
    return { error: null };
}

export async function toggleAdminStatus(userId: string, currentStatus: boolean) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: '認証が必要です。' };
    }

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) {
        return { error: '管理者権限が必要です。' };
    }

     if (user.id === userId) {
        return { error: "自身の管理者ステータスは変更できません。" };
    }

    const { error } = await supabase
        .from('members')
        .update({ is_admin: !currentStatus })
        .eq('supabase_auth_user_id', userId);
    
    if (error) {
        return { error: '管理者ステータスの更新に失敗しました。' };
    }

    revalidatePath('/dashboard/admin/members');
    return { error: null };
}

export async function deleteMember(userId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: '認証が必要です。' };
    }

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) {
        return { error: '管理者権限が必要です。' };
    }

    if (user.id === userId) {
        return { error: "自分自身を削除することはできません。" };
    }

    const { error } = await supabase
        .from('members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('supabase_auth_user_id', userId);

    if (error) {
        return { error: 'メンバーの削除に失敗しました。' };
    }

    revalidatePath('/dashboard/admin/members');
    return { error: null };
}
