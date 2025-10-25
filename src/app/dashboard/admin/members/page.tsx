import { createAdminClient } from '@/lib/supabase/server';
import { MemberManagementClient } from '@/components/dashboard/admin/MemberManagementClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Member, Team } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

async function getMembersData() {
    const supabase = createClient();
    const supabaseAdmin = createAdminClient();
    
    const { data: members, error: membersError } = await supabase
        .from('members')
        .select('*')
        .is('deleted_at', null)
        .order('generation', { ascending: false })
        .order('student_number', { ascending: true });

    if (membersError) {
        console.error('Error fetching members:', membersError);
        throw membersError;
    }

    // Fetch user details from auth.users to get their names
    const userIds = members.map(m => m.supabase_auth_user_id);
    const { data: { users: usersData }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: userIds.length,
    });
    
    if (usersError) {
        console.error('Error fetching user metadata:', usersError);
        throw usersError;
    }

    const profilesWithNames = members.map(member => {
        const user = usersData.find(u => u.id === member.supabase_auth_user_id);
        return {
            ...member,
            name: user?.user_metadata?.name || '不明なユーザー',
        };
    });


    const { data: teams, error: teamsError } = await supabase.from('teams').select('*');
    if (teamsError) {
        console.error('Error fetching teams:', teamsError);
    }
    
    return {
        profiles: profilesWithNames,
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
