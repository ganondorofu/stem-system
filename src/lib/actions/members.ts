
"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ensureGenerationRoleExists } from './generations';

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
    team_ids: z.array(z.string()).optional(),
}).refine(data => {
    if (data.status === 0 || data.status === 1) {
        return !!data.grade;
    }
    return true;
}, {
    message: '学年は必須です。',
    path: ['grade'],
}).refine(data => {
    if (data.status === 2) { // OB/OG
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

async function syncDiscordRoles(discordUid: string) {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    if (!apiUrl || !token) {
        console.error('API URL or Bearer Token is not configured for Discord role sync.');
        return; // Don't throw error, just log and skip sync
    }
    
    try {
        const res = await fetch(`${apiUrl}/api/roles/sync`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ discord_uid: discordUid }),
            cache: 'no-store',
        });
         if (!res.ok) {
            console.error('Failed to sync roles:', res.status, await res.text());
        }
    } catch (e) {
        console.error('Error during role sync:', e);
    }
}

async function syncDiscordNickname(discordUid: string, name: string) {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    if (!apiUrl || !token) {
        console.error('API URL or Bearer Token is not configured for Discord nickname sync.');
        return;
    }
    
    // The bot will construct the full nickname based on DB data. We just provide the name.
    const body = {
        discord_uid: discordUid,
        name: name,
    };

    try {
        const res = await fetch(`${apiUrl}/api/nickname/update`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            cache: 'no-store',
        });
        if (!res.ok) {
            const errorBody = await res.text();
            console.error('Failed to update nickname:', res.status, errorBody);
        }
    } catch(e) {
        console.error('Error during nickname update:', e);
    }
}

export async function getMemberDisplayName(discordUid: string): Promise<string | null> {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    if (!apiUrl || !token || !discordUid) {
        return null;
    }

    try {
        const response = await fetch(`${apiUrl}/api/nickname?discord_uid=${discordUid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`Failed to fetch nickname for ${discordUid}:`, response.status, await response.text());
            return null;
        }
        
        const data = await response.json();
        return data.name_only || null;
    } catch (error) {
        console.error(`Error fetching nickname for ${discordUid}:`, error);
        return null;
    }
}


export async function registerNewMember(values: z.infer<typeof registerSchema>) {
    const supabase = await createClient();
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
    
    const { status, name, grade, student_number, generation: directGeneration, team_ids } = parsedData.data;

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
    
    await ensureGenerationRoleExists(finalGeneration);

    const { error: memberInsertError, data: newMember } = await supabase.from('members').insert({
        supabase_auth_user_id: user.id,
        discord_uid: user.user_metadata.provider_id,
        avatar_url: user.user_metadata.avatar_url,
        is_admin: false,
        status,
        student_number,
        generation: finalGeneration
    }).select().single();

    if (memberInsertError) {
        console.error('Error creating member profile:', memberInsertError);
        return { error: '部員情報の作成に失敗しました。' };
    }
    
    if (team_ids && team_ids.length > 0) {
        const relations = team_ids.map(team_id => ({
            member_id: newMember.supabase_auth_user_id,
            team_id: team_id
        }));
        const { error: relationError } = await supabase.from('member_team_relations').insert(relations);
        if (relationError) {
            console.error('Error creating member-team relations:', relationError);
        }
    }

    await syncDiscordNickname(user.user_metadata.provider_id, sanitizedName);
    await syncDiscordRoles(user.user_metadata.provider_id);

    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard/admin/members');
    return { error: null };
}


export async function updateMyProfile(values: z.infer<typeof profileSchema>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'プロフィールを更新するにはログインする必要があります。' };
    }

    const parsedData = profileSchema.safeParse(values);
    if (!parsedData.success) {
        return { error: '無効なデータが提供されました。' };
    }
    
    const { generation, student_number, status } = parsedData.data;

    await ensureGenerationRoleExists(generation);

    const { error } = await supabase
        .from('members')
        .update({
            generation: generation,
            student_number: student_number,
            status: status,
        })
        .eq('supabase_auth_user_id', user.id);

    if (error) {
        console.error('Error updating profile:', error);
        return { error: 'プロフィールの更新に失敗しました。もう一度お試しください。' };
    }
    
    const {data: member} = await supabase.from("members").select("discord_uid").eq("supabase_auth_user_id", user.id).single();
    if(member){
        await syncDiscordRoles(member.discord_uid);
    }


    revalidatePath('/dashboard', 'layout');
    return { error: null };
}

export async function updateMemberAdmin(userId: string, values: z.infer<typeof profileSchema>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: '認証が必要です。' };
    }

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) {
        return { error: '管理者権限が必要です。' };
    }
    
    const { generation, student_number, status } = values;

    await ensureGenerationRoleExists(generation);

    const { error } = await supabase
        .from('members')
        .update(values)
        .eq('supabase_auth_user_id', userId);

    if (error) {
        console.error('Error updating member by admin:', error);
        return { error: 'メンバーの更新に失敗しました。' };
    }
    
    const { data: memberData } = await supabase.from('members').select('discord_uid').eq('supabase_auth_user_id', userId).single();
    if (memberData) {
        await syncDiscordRoles(memberData.discord_uid);
    }

    revalidatePath('/dashboard/admin/members');
    return { error: null };
}

export async function toggleAdminStatus(userId: string, currentStatus: boolean) {
    const supabase = await createClient();
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
    const supabase = await createClient();
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

export async function updateMemberTeams(memberId: string, teamIds: string[]): Promise<{ error: string | null }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: '認証が必要です。' };

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) return { error: '管理者権限が必要です。' };

    try {
        const { error: deleteError } = await supabase
            .from('member_team_relations')
            .delete()
            .eq('member_id', memberId);

        if (deleteError) throw deleteError;

        if (teamIds.length > 0) {
            const newRelations = teamIds.map(teamId => ({
                member_id: memberId,
                team_id: teamId,
            }));
            const { error: insertError } = await supabase
                .from('member_team_relations')
                .insert(newRelations);
            
            if (insertError) throw insertError;
        }

        const { data: member } = await supabase.from('members').select('discord_uid').eq('supabase_auth_user_id', memberId).single();
        if (member) {
            await syncDiscordRoles(member.discord_uid);
        }

        revalidatePath('/dashboard/admin/members');
        revalidatePath('/dashboard/admin/teams');
        return { error: null };
    } catch (e: any) {
        console.error("Error updating member teams:", e);
        return { error: e.message };
    }
}
