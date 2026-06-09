import { createClient } from '@/lib/supabase/server';
import { RegisterForm } from '@/components/dashboard/RegisterForm';
import type { Team } from '@/lib/types';

async function getTeams(): Promise<Team[]> {
    const supabase = await createClient();
    const { data, error } = await supabase.from('teams').select('*');
    if (error) {
        console.error('Error fetching teams:', error);
        return [];
    }
    return data;
}

export default async function RegisterPage() {
    const teams = await getTeams();
    // Discord連携ユーザーか判定（IDログイン=中学生は姓名入力不要・ユーザーIDが名前）
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const isDiscord = !!user?.user_metadata?.provider_id;
    return <RegisterForm teams={teams} isDiscord={isDiscord} />;
}
