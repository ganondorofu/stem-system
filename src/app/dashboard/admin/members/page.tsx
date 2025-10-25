import { createAdminClient } from '@/lib/supabase/server';
import { MemberManagementClient } from '@/components/dashboard/admin/MemberManagementClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Member, Team, MemberWithTeamsAndRelations, MemberTeamRelation } from '@/lib/types';
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

    const userIds = members.map(m => m.supabase_auth_user_id);
    const { data: { users: usersData }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: userIds.length,
    });
    
    if (usersError) {
        console.error('Error fetching user metadata:', usersError);
        throw usersError;
    }
    
    const { data: teams, error: teamsError } = await supabase.from('teams').select('*');
    if (teamsError) console.error('Error fetching teams:', teamsError);

    const { data: relations, error: relationsError } = await supabase.from('member_team_relations').select('*');
    if (relationsError) console.error('Error fetching relations:', relationsError);

    const membersWithData: MemberWithTeamsAndRelations[] = members.map(member => {
        const user = usersData.find(u => u.id === member.supabase_auth_user_id);
        const memberRelations = relations?.filter(r => r.member_id === member.supabase_auth_user_id) || [];
        const memberTeams = memberRelations.map(mr => teams?.find(t => t.id === mr.team_id)).filter(Boolean) as Team[];

        return {
            ...member,
            name: user?.user_metadata?.name || '不明なユーザー',
            relations: memberRelations,
            teams: memberTeams,
        };
    });
    
    return {
        profiles: membersWithData,
        allTeams: (teams as Team[]) || [],
    };
}

export default async function MemberManagementPage() {
    const { profiles, allTeams } = await getMembersData();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>メンバー管理</CardTitle>
                <CardDescription>すべての部員のロールとステータス、所属班を管理します。</CardDescription>
            </CardHeader>
            <CardContent>
                <MemberManagementClient initialMembers={profiles} allTeams={allTeams} />
            </CardContent>
        </Card>
    );
}
