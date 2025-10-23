"use server";

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const profileSchema = z.object({
    generation: z.coerce.number().int().min(0, 'Generation must be a non-negative number.'),
    student_number: z.string().optional().nullable(),
    status: z.coerce.number().int().min(0).max(2),
});

export async function updateMyProfile(values: z.infer<typeof profileSchema>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'You must be logged in to update your profile.' };
    }

    const parsedData = profileSchema.safeParse(values);
    if (!parsedData.success) {
        return { error: 'Invalid data provided.' };
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
        return { error: 'Failed to update profile. Please try again.' };
    }

    revalidatePath('/dashboard', 'layout');
    return { error: null };
}

export async function updateMemberAdmin(userId: string, values: z.infer<typeof profileSchema>) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Authentication required.' };
    }

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) {
        return { error: 'Administrator privileges required.' };
    }

    const { error } = await supabase
        .from('members')
        .update(values)
        .eq('supabase_auth_user_id', userId);

    if (error) {
        console.error('Error updating member by admin:', error);
        return { error: 'Failed to update member.' };
    }

    revalidatePath('/dashboard/admin/members');
    return { error: null };
}

export async function toggleAdminStatus(userId: string, currentStatus: boolean) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Authentication required.' };
    }

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) {
        return { error: 'Administrator privileges required.' };
    }

     if (user.id === userId) {
        return { error: "Cannot change your own admin status." };
    }

    const { error } = await supabase
        .from('members')
        .update({ is_admin: !currentStatus })
        .eq('supabase_auth_user_id', userId);
    
    if (error) {
        return { error: 'Failed to update admin status.' };
    }

    revalidatePath('/dashboard/admin/members');
    return { error: null };
}

export async function deleteMember(userId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: 'Authentication required.' };
    }

    const { data: admin } = await supabase.from('members').select('is_admin').eq('supabase_auth_user_id', user.id).single();
    if (!admin?.is_admin) {
        return { error: 'Administrator privileges required.' };
    }

    if (user.id === userId) {
        return { error: "Cannot delete yourself." };
    }

    const { error } = await supabase
        .from('members')
        .update({ deleted_at: new Date().toISOString() })
        .eq('supabase_auth_user_id', userId);

    if (error) {
        return { error: 'Failed to delete member.' };
    }

    revalidatePath('/dashboard/admin/members');
    return { error: null };
}
