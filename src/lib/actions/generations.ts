"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { GenerationRole } from '../types';

async function checkAdmin() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) throw new Error('Administrator privileges required.');
}

export async function updateGenerationRoles(roles: GenerationRole[]): Promise<{ error: string | null }> {
    try {
        await checkAdmin();
        const supabase = createClient();

        // Use a transaction to update all roles
        // First delete all existing roles, then insert the new ones.
        // This is simpler than upserting for this use case.
        
        const { error: deleteError } = await supabase.from('generation_roles').delete().neq('generation', -1); // delete all
        if (deleteError) throw deleteError;
        
        // Filter out any rows that might be empty from the UI
        const validRoles = roles.filter(r => r.generation >= 0 && r.discord_role_id.trim() !== '');

        if (validRoles.length > 0) {
            const { error: insertError } = await supabase.from('generation_roles').insert(validRoles);
            if (insertError) throw insertError;
        }

        revalidatePath('/dashboard/admin/generations');
        return { error: null };
    } catch (e: any) {
        return { error: e.message };
    }
}
