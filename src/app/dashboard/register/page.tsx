import { createClient } from '@/lib/supabase/server';
import { RegisterForm } from '@/components/dashboard/RegisterForm';
import type { Team } from '@/lib/types';

async function getTeams(): Promise<Team[]> {
    const supabase = createClient();
    const { data, error } = await supabase.from('teams').select('*');
    if (error) {
        console.error('Error fetching teams:', error);
        return [];
    }
    return data;
}

export default async function RegisterPage() {
    const teams = await getTeams();
    return <RegisterForm teams={teams} />;
}
