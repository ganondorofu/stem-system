
"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { GenerationRole } from '../types';

async function checkAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Authentication required.');

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) throw new Error('Administrator privileges required.');
}

async function callCreateGenerationApi(generation: number): Promise<GenerationRole | null> {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    if (!apiUrl || !token) {
        throw new Error('API URL or Bearer Token is not configured.');
    }

    const response = await fetch(`${apiUrl}/api/generation`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ generation }),
        cache: 'no-store',
    });

    const result = await response.json();
    
    if (!response.ok || !result.success) {
        throw new Error(result.error || 'Discordロールの作成に失敗しました。');
    }

    return {
        generation: result.generation,
        discord_role_id: result.role_id,
    };
}


export async function ensureGenerationRoleExists(generation: number): Promise<void> {
    const supabase = await createClient();
    const { data: existingRole } = await supabase
        .from('generation_roles')
        .select('generation')
        .eq('generation', generation)
        .single();
    
    if (!existingRole) {
        try {
            await callCreateGenerationApi(generation);
            // The API saves to the DB, but revalidation is good.
            revalidatePath('/dashboard/admin/generations');
        } catch (e: any) {
            // This might fail if another process created it in the meantime.
            // We can ignore the error for this "ensure" function.
             console.error(`Could not ensure generation role for ${generation} exists: ${e.message}`);
        }
    }
}


export async function createGenerationRole(generation: number): Promise<{ error: string | null, newRole: GenerationRole | null }> {
    try {
        await checkAdmin();
        const supabase = await createClient();

        // Check if role already exists in DB
        const { data: existingRole, error: existingError } = await supabase
            .from('generation_roles')
            .select('generation')
            .eq('generation', generation)
            .single();

        if (existingError && existingError.code !== 'PGRST116') { // PGRST116 is "No rows found"
            throw existingError;
        }
        if (existingRole) {
            return { error: `期生 ${generation} は既に存在します。`, newRole: null };
        }

        const newRole = await callCreateGenerationApi(generation);
        
        revalidatePath('/dashboard/admin/generations');
        return { error: null, newRole };

    } catch (e: any) {
        console.error('Error creating generation role:', e);
        return { error: e.message, newRole: null };
    }
}


export async function updateGenerationRoles(roles: GenerationRole[]): Promise<{ error: string | null }> {
    try {
        await checkAdmin();
        const supabase = await createClient();

        // Use a transaction to update all roles
        // First delete all existing roles, then insert the new ones.
        // This is simpler than upserting for this use case.
        
        const { error: deleteError } = await supabase.from('generation_roles').delete().neq('generation', -1); // delete all
        if (deleteError) throw deleteError;
        
        // Filter out any rows that might be empty from the UI
        const validRoles = roles.filter(r => r.generation >= 0 && String(r.discord_role_id).trim() !== '');

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
