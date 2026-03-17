import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TeamManagementClient } from '@/components/dashboard/admin/TeamManagementClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@supabase/supabase-js';
import type { EnrichedMember } from '@/lib/types';


async function getAllDiscordNames(): Promise<Map<string, string>> {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;
    const nameMap = new Map<string, string>();

    if (!apiUrl || !token) {
        console.error('[getAllDiscordNames] API URL or Token is missing.');
        return nameMap;
    }

    try {
        const response = await fetch(`${apiUrl}/api/members`, {
            headers: { 'Authorization': `Bearer ${token}` },
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error('[getAllDiscordNames] Failed to fetch members:', response.status);
            return nameMap;
        }

        const json = await response.json();
        const members = json.data ?? json;
        if (Array.isArray(members)) {
            for (const member of members) {
                if (member.uid && member.name) {
                    nameMap.set(member.uid, member.name);
                }
            }
        }
    } catch (error) {
        console.error('[getAllDiscordNames] Error:', error);
    }

    return nameMap;
}

async function getTeamsData() {
    const supabase = await createClient();
    const supabaseAdmin = await createAdminClient();

    const [teamsRes, membersRes, relationsRes, leadersRes, discordNames] = await Promise.all([
        supabase.from('teams').select('*').order('name'),
        supabase.from('members').select('supabase_auth_user_id, generation, student_number, discord_uid').is('deleted_at', null),
        supabase.from('member_team_relations').select('*'),
        supabase.from('team_leaders').select('*'),
        getAllDiscordNames(),
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
        const discordName = discordNames.get(member.discord_uid) || null;
        const displayName = discordName || user?.user_metadata.name || '名前不明';

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

    