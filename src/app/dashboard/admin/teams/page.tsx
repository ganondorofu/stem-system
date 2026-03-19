import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TeamManagementClient } from '@/components/dashboard/admin/TeamManagementClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@supabase/supabase-js';
import type { EnrichedMember } from '@/lib/types';

async function getTeamsData() {
    const supabase = await createClient();
    const supabaseAdmin = await createAdminClient();

    const [teamsRes, membersRes, relationsRes, leadersRes] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.from('members').select('supabase_auth_user_id, generation, student_number, discord_uid, discord_username').is('deleted_at', null),
        supabase.from('member_team_relations').select('*'),
        supabase.from('team_leaders').select('*'),
    ]);

    if (teamsRes.error) console.error('Error fetching teams:', teamsRes.error);
    if (membersRes.error) console.error('Error fetching members:', membersRes.error);
    if (relationsRes.error) console.error('Error fetching relations:', relationsRes.error);
    if (leadersRes.error) console.error('Error fetching leaders:', leadersRes.error);

    const members = membersRes.data || [];
    const memberIds = members.map(m => m.supabase_auth_user_id);
    let users: User[] = [];
    if (memberIds.length > 0) {
      const { data: { users: usersData }, error: usersError } = await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: memberIds.length,
      });
       if (usersError) console.error('Error fetching user metadata:', usersError);
       else users = usersData;
    }

    const enrichedMembers: EnrichedMember[] = members.map((member) => {
        const user = users.find(u => u.id === member.supabase_auth_user_id);
        const displayName = member.discord_username || user?.user_metadata.full_name || '名前不明';

        return {
            ...member,
            displayName,
            avatar_url: user?.user_metadata.avatar_url || null,
        }
    });

    return {
        teams: teamsRes.data || [],
        members: enrichedMembers,
        relations: relationsRes.data || [],
        leaders: leadersRes.data || [],
    };
}

export default async function TeamManagementPage() {
    const data = await getTeamsData();

    return (
        <Card>
            <CardHeader>
                <CardTitle>班管理</CardTitle>
                <CardDescription>班の作成と管理、メンバーの割り当て、班長の指名を行います。</CardDescription>
            </CardHeader>
            <CardContent>
                <TeamManagementClient {...data} />
            </CardContent>
        </Card>
    );
}
