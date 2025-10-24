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
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('認証が必要です。');

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) throw new Error('管理者権限が必要です。');
}

export async function createTeam(values: z.infer<typeof teamSchema>): Promise<{ error: string | null, team: Team | null }> {
    try {
        await checkAdmin();
        const supabase = createClient();
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
        const supabase = createClient();
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
        const supabase = createClient();
        
        const { error } = await supabase.from('teams').delete().eq('id', teamId);
        if (error) throw error;
        
        revalidatePath('/dashboard/admin/teams');
        return { error: null };
    } catch (e: any) {
        return { error: e.message };
    }
}
