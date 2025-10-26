
"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ensureGenerationRoleExists } from './generations';

const studentNumberRegex = /^[0-9]+$/;

// Schema for re-syncing Discord member (for users who left and rejoined)
const reSyncSchema = z.object({
    last_name: z.string().min(1, '姓は必須です。'),
    first_name: z.string().min(1, '名は必須です。'),
});

// Schema for updating own profile (allows changing status to OB/OG)
const profileSchema = z.object({
    generation: z.coerce.number().int().min(0, '期は0以上の数字である必要があります。'),
    student_number: z.string().optional().nullable(),
    status: z.coerce.number().int().min(0).max(2),
});

// Schema for initial registration
const registerSchema = z.object({
    last_name: z.string().min(1, '姓は必須です。'),
    first_name: z.string().min(1, '名は必須です。'),
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

    console.log(`[Discord Bot] Attempting to sync roles for discord_uid: ${discordUid}`);

    if (!apiUrl || !token) {
        console.error('[Discord Bot] API URL or Bearer Token is not configured for Discord role sync.');
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
            const errorText = await res.text();
            console.error(`[Discord Bot] Failed to sync roles for ${discordUid}. Status: ${res.status}, Body: ${errorText}`);
        } else {
            console.log(`[Discord Bot] Successfully initiated role sync for discord_uid: ${discordUid}`);
        }
    } catch (e) {
        console.error(`[Discord Bot] Error during role sync for ${discordUid}:`, e);
    }
}

async function syncDiscordNickname(discordUid: string, name: string) {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    console.log(`[Discord Bot] Attempting to update nickname for discord_uid: ${discordUid} to a name based on: "${name}"`);

    if (!apiUrl || !token) {
        console.error('[Discord Bot] API URL or Bearer Token is not configured for Discord nickname sync.');
        return;
    }
    
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
            console.error(`[Discord Bot] Failed to update nickname for ${discordUid}. Status: ${res.status}, Body: ${errorBody}`);
        } else {
             console.log(`[Discord Bot] Successfully initiated nickname update for discord_uid: ${discordUid}`);
        }
    } catch(e) {
        console.error(`[Discord Bot] Error during nickname update for ${discordUid}:`, e);
    }
}

export async function getMemberDisplayName(discordUid: string): Promise<string | null> {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    console.log(`[Discord Bot] Attempting to get display name for discord_uid: ${discordUid}`);

    if (!apiUrl || !token || !discordUid) {
        console.error(`[Discord Bot] Cannot get display name. API URL, Token, or Discord UID is missing.`);
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
            const errorText = await response.text();
            console.error(`[Discord Bot] Failed to fetch nickname for ${discordUid}: Status ${response.status}, Body: ${errorText}`);
            return null;
        }
        
        const data = await response.json();
        console.log(`[Discord Bot] Fetched display name data for ${discordUid}:`, data);
        return data.name_only || null;
    } catch (error) {
        console.error(`[Discord Bot] Error fetching nickname for ${discordUid}:`, error);
        return null;
    }
}

type MemberNameMap = { [key: string]: string };

export async function getAllMemberNames(): Promise<MemberNameMap | null> {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    console.log(`[getAllMemberNames] Attempting to fetch all member names.`);

    if (!apiUrl || !token) {
        console.error(`[getAllMemberNames] Aborting: API URL or Token is missing.`);
        return null;
    }

    try {
        const response = await fetch(`${apiUrl}/api/members`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-store',
        });
        
        if (!response.ok) {
            const responseText = await response.text();
            console.error(`[getAllMemberNames] Failed to fetch - Status: ${response.status}, Body: ${responseText}`);
            return null;
        }
        
        const data = await response.json();
        if (!data.success || !Array.isArray(data.data)) {
            console.error(`[getAllMemberNames] API response was not successful or data is not an array.`);
            return null;
        }

        const nameMap: MemberNameMap = data.data.reduce((acc: MemberNameMap, member: { uid: string, name: string }) => {
            acc[member.uid] = member.name;
            return acc;
        }, {});
        
        console.log(`[getAllMemberNames] Successfully fetched and mapped ${Object.keys(nameMap).length} members.`);
        return nameMap;
    } catch (error) {
        console.error(`[getAllMemberNames] Error fetching member names:`, error);
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
    
    const { status, last_name, first_name, grade, student_number, generation: directGeneration, team_ids } = parsedData.data;

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

    // Concatenate last_name and first_name, removing any spaces
    const fullName = (last_name + first_name).replace(/\s/g, '');
    
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

    await syncDiscordNickname(user.user_metadata.provider_id, fullName);
    await syncDiscordRoles(user.user_metadata.provider_id);

    revalidatePath('/dashboard', 'layout');
    revalidatePath('/dashboard/admin/members');
    return { error: null };
}


export async function resyncDiscordMember(values: z.infer<typeof reSyncSchema>) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: '再連携するにはログインする必要があります。' };
    }

    const parsedData = reSyncSchema.safeParse(values);
    if (!parsedData.success) {
        const firstError = parsedData.error.flatten().fieldErrors;
        const errorMessage = Object.values(firstError)[0]?.[0] || '無効なデータが提供されました。';
        return { error: errorMessage };
    }

    const { last_name, first_name } = parsedData.data;
    const fullName = (last_name + first_name).replace(/\s/g, '');
    const discordUid = user.user_metadata.provider_id;

    if (!discordUid) {
        return { error: 'Discord UIDが取得できませんでした。' };
    }

    // Check if member profile exists
    const { data: memberProfile } = await supabase
        .from('members')
        .select('*')
        .eq('supabase_auth_user_id', user.id)
        .is('deleted_at', null)
        .single();

    if (!memberProfile) {
        return { error: 'メンバー情報が見つかりません。新規登録が必要です。' };
    }

    // Re-sync Discord nickname and roles
    await syncDiscordNickname(discordUid, fullName);
    await syncDiscordRoles(discordUid);

    revalidatePath('/dashboard', 'layout');
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

    

    
