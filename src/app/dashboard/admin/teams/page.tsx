import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TeamManagementClient } from '@/components/dashboard/admin/TeamManagementClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@supabase/supabase-js';

async function getTeamsData() {
    const supabase = createClient();
    const supabaseAdmin = createAdminClient();
    
    const teamsPromise = supabase.from('teams').select('*').order('name');
    // Remove raw_user_meta_data from this select
    const membersPromise = supabase.from('members').select('supabase_auth_user_id, generation, student_number, discord_uid').is('deleted_at', null);
    const relationsPromise = supabase.from('member_team_relations').select('*');
    const leadersPromise = supabase.from('team_leaders').select('*');

    const [teamsRes, membersRes, relationsRes, leadersRes] = await Promise.all([
        teamsPromise, membersPromise, relationsPromise, leadersPromise
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

    const enrichedMembers = members.map(member => {
        const user = users.find(u => u.id === member.supabase_auth_user_id);
        return {
            ...member,
            raw_user_meta_data: { name: user?.user_metadata.name || '名前不明' }
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
