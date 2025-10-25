import { createClient } from '@/lib/supabase/server';
import { MemberManagementClient } from '@/components/dashboard/admin/MemberManagementClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Member, Team } from '@/lib/types';

async function getMembersData() {
    const supabase = createClient();
    
    const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*')
        .is('deleted_at', null)
        .order('generation', { ascending: false })
        .order('student_number', { ascending: true });

    if (membersError) {
        console.error('Error fetching members:', membersError);
        return { profiles: [], teams: [] };
    }

    const { data: teams, error: teamsError } = await supabase.from('teams').select('*');
    if (teamsError) {
        console.error('Error fetching teams:', teamsError);
    }
    
    return {
        profiles: (members as Member[]) || [],
        teams: (teams as Team[]) || [],
    };
}

export default async function MemberManagementPage() {
    const { profiles, teams } = await getMembersData();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>メンバー管理</CardTitle>
                <CardDescription>すべての部員のロールとステータスを管理します。</CardDescription>
            </CardHeader>
            <CardContent>
                <MemberManagementClient initialMembers={profiles} allTeams={teams} />
            </CardContent>
        </Card>
    );
}

    