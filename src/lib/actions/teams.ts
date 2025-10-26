"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { Team } from '../types';

const teamSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, '班の名前は必須です。'),
  discord_role_id: z.string().min(1, 'DiscordロールIDは必須です。'),
});

async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です。');

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) throw new Error('管理者権限が必要です。');
}

async function syncDiscordRoles(discordUid: string) {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    if (!apiUrl || !token) {
        console.error('API URL or Bearer Token is not configured for Discord role sync.');
        return;
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


export async function createTeam(values: z.infer<typeof teamSchema>): Promise<{ error: string | null, team: Team | null }> {
    try {
        await checkAdmin();
        const supabase = await createClient();
        const parsedData = teamSchema.safeParse(values);
        if (!parsedData.success) return { error: '無効なデータです。', team: null };

        const { name, discord_role_id } = parsedData.data;

        const { data: newTeam, error } = await supabase
            .from('teams')
            .insert({ name, discord_role_id })
            .select()
            .single();

        if (error) throw error;
        
        revalidatePath('/dashboard/admin/teams');
        return { error: null, team: newTeam };
    } catch (e: any) {
        return { error: e.message, team: null };
    }
}

export async function updateTeam(values: z.infer<typeof teamSchema>): Promise<{ error: string | null, team: Team | null }> {
     try {
        await checkAdmin();
        const supabase = await createClient();
        const parsedData = teamSchema.safeParse(values);
        if (!parsedData.success || !parsedData.data.id) return { error: '無効なデータです。', team: null };

        const { id, name, discord_role_id } = parsedData.data;
        const { data: updatedTeam, error } = await supabase
            .from('teams')
            .update({ name, discord_role_id })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        revalidatePath('/dashboard/admin/teams');
        return { error: null, team: updatedTeam };
    } catch (e: any) {
        return { error: e.message, team: null };
    }
}

export async function deleteTeam(teamId: string): Promise<{ error: string | null }> {
    try {
        await checkAdmin();
        const supabase = await createClient();
        
        const { error } = await supabase.from('teams').delete().eq('id', teamId);
        if (error) throw error;
        
        revalidatePath('/dashboard/admin/teams');
        return { error: null };
    } catch (e: any) {
        return { error: e.message };
    }
}


export async function updateTeamLeaders(teamId: string, memberIds: string[]): Promise<{ error: string | null }> {
    try {
        await checkAdmin();
        const supabase = await createClient();

        // Find old leaders to sync their roles later
        const { data: oldLeadersData, error: oldLeadersError } = await supabase.from('team_leaders')
            .select('member_id')
            .eq('team_id', teamId);
        
        if (oldLeadersError) throw oldLeadersError;
        
        const oldLeaderIds = oldLeadersData.map(l => l.member_id);

        const { error: deleteError } = await supabase.from('team_leaders').delete().eq('team_id', teamId);
        if (deleteError) throw deleteError;

        if (memberIds.length > 0) {
            const newLeaders = memberIds.map(member_id => ({ team_id: teamId, member_id }));
            const { error: insertError } = await supabase.from('team_leaders').insert(newLeaders);
            if (insertError) throw insertError;
        }

        const idsToSync = [...new Set([...oldLeaderIds, ...memberIds])];

        if (idsToSync.length > 0) {
            const { data: membersToSync, error: membersError } = await supabase.from('members')
                .select('discord_uid')
                .in('supabase_auth_user_id', idsToSync);
            
            if (membersError) throw membersError;

            if (membersToSync) {
                for (const member of membersToSync) {
                    await syncDiscordRoles(member.discord_uid);
                }
            }
        }

        revalidatePath('/dashboard/admin/teams');
        return { error: null };
    } catch (e: any) {
        console.error("Error updating team leaders:", e);
        return { error: e.message };
    }
}
