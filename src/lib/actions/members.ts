"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const studentNumberRegex = /^[0-9]+$/;

// Schema for updating own profile (allows changing status to OB/OG)
const profileSchema = z.object({
    generation: z.coerce.number().int().min(0, '期は0以上の数字である必要があります。'),
    student_number: z.string().optional().nullable(),
    status: z.coerce.number().int().min(0).max(2),
});

// Schema for initial registration
const registerSchema = z.object({
    name: z.string().min(1, '氏名は必須です。'),
    status: z.coerce.number().int().min(0).max(2),
    grade: z.coerce.number().int().min(1).max(3).optional(),
    student_number: z.string().regex(studentNumberRegex, '学籍番号は半角数字で入力してください。').optional().nullable(),
    generation: z.coerce.number().int().min(1, '期は正の整数である必要があります。').optional(),
}).refine(data => {
    if (data.status === 0 || data.status === 1) {
        return !!data.grade;
    }
    return true;
}, {
    message: '学年は必須です。',
    path: ['grade'],
}).refine(data => {
    if (data.status === 2) {
        return !!data.generation;
    }
    return true;
}, {
    message: '期は必須です。',
    path: ['generation'],
});

function getAcademicYear() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed (0 for January)
    return month >= 3 ? year : year - 1; // Academic year starts in April (month 3)
}

function calculateGeneration(status: number, grade: number, academicYear: number) {
    if (status === 1) { // High School
        return 10 + (academicYear - 2025) - grade + 1;
    }
    if (status === 0) { // Junior High
        return 10 + (academicYear - 2025) + 4 - grade;
    }
    return null;
}

async function syncDiscord(discordUid: string, name: string) {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    if (!apiUrl || !token) {
        console.error('API URL or Bearer Token is not configured for Discord sync.');
        return; // Don't throw error, just log and skip sync
    }
    
    // Sync roles first
    try {
        await fetch(`${apiUrl}/api/roles/sync`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ discord_uid: discordUid }),
        });
    } catch (e) {
        console.error('Failed to sync roles:', e);
    }
    
    // Then update nickname
    try {
        await fetch(`${apiUrl}/api/nickname/update`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ discord_uid: discordUid, name: name }),
        });
    } catch(e) {
        console.error('Failed to update nickname:', e);
    }
}


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
        .is('deleted_at', null)
        .single();

    if (existingMember) {
        return { error: 'このユーザーは既に登録済みです。' };
    }

    const parsedData = registerSchema.safeParse(values);
    if (!parsedData.success) {
        console.error("Invalid registration data:", parsedData.error.flatten());
        const firstError = parsedData.error.flatten().fieldErrors;
        const errorMessage = Object.values(firstError)[0]?.[0] || '無効なデータが提供されました。';
        return { error: errorMessage };
    }
    
    const { status, name, grade, student_number, generation: directGeneration } = parsedData.data;

    let finalGeneration: number | null = null;

    if (status === 2) { // OB/OG
        finalGeneration = directGeneration!;
    } else { // Student
        const academicYear = getAcademicYear();
        finalGeneration = calculateGeneration(status, grade!, academicYear);
    }
    
    if (finalGeneration === null) {
        return { error: '期を計算できませんでした。入力内容を確認してください。' };
    }

    const sanitizedName = name.replace(/\s/g, '');

    const { error } = await supabase.from('members').insert({
        supabase_auth_user_id: user.id,
        discord_uid: user.user_metadata.provider_id,
        avatar_url: user.user_metadata.avatar_url,
        is_admin: false,
        name: sanitizedName,
        status,
        student_number,
        generation: finalGeneration,
    });

    if (error) {
        console.error('Error creating member profile:', error);
        return { error: '部員情報の作成に失敗しました。' };
    }

    // Sync with Discord without waiting for it to finish
    await syncDiscord(user.user_metadata.provider_id, sanitizedName);

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

    