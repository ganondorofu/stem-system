import { createAdminClient } from '@/lib/supabase/server';
import { MemberManagementClient } from '@/components/dashboard/admin/MemberManagementClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Member, Team, MemberWithTeamsAndRelations, MemberTeamRelation } from '@/lib/types';
import { createClient } from '@/lib/supabase/server';

async function getDiscordName(discordUid: string): Promise<string | null> {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    if (!apiUrl || !token || !discordUid) {
        return null;
    }

    try {
        const response = await fetch(`${apiUrl}/api/nickname?discord_uid=${discordUid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`Failed to fetch nickname for ${discordUid}:`, response.status, await response.text());
            return null;
        }
        
        const data = await response.json();
        return data.name_only || null;
    } catch (error) {
        console.error(`Error fetching nickname for ${discordUid}:`, error);
        return null;
    }
}


async function getMembersData() {
    const supabase = await createClient();
    const supabaseAdmin = await createAdminClient();
    
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

    const membersWithData: MemberWithTeamsAndRelations[] = await Promise.all(members.map(async (member) => {
        const user = usersData.find(u => u.id === member.supabase_auth_user_id);
        const memberRelations = relations?.filter(r => r.member_id === member.supabase_auth_user_id) || [];
        const memberTeams = memberRelations.map(mr => teams?.find(t => t.id === mr.team_id)).filter(Boolean) as Team[];
        
        const discordName = await getDiscordName(member.discord_uid);
        const memberName = discordName || user?.user_metadata.name || '名前不明';

        return {
            ...member,
            displayName: memberName,
            relations: memberRelations,
            teams: memberTeams,
        };
    }));
    
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
