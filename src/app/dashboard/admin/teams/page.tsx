import { createClient, createAdminClient } from '@/lib/supabase/server';
import { TeamManagementClient } from '@/components/dashboard/admin/TeamManagementClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { User } from '@supabase/supabase-js';
import type { EnrichedMember } from '@/lib/types';


async function getDiscordName(discordUid: string): Promise<string | null> {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    console.log(`[getDiscordName] Attempting to fetch name for discord_uid: ${discordUid}`);

    if (!apiUrl || !token || !discordUid) {
        console.error(`[getDiscordName] Aborting: API URL, Token, or Discord UID is missing.`);
        return null;
    }

    try {
        const response = await fetch(`${apiUrl}/api/member/name?discord_uid=${discordUid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-store',
        });
        
        const responseText = await response.text();
        console.log(`[getDiscordName] Response for ${discordUid} - Status: ${response.status}, Body: ${responseText}`);

        if (!response.ok) {
            return null;
        }
        
        const data = JSON.parse(responseText);
        return data.name_only || null;
    } catch (error) {
        console.error(`[getDiscordName] Error fetching nickname for ${discordUid}:`, error);
        return null;
    }
}

async function getTeamsData() {
    const supabase = await createClient();
    const supabaseAdmin = await createAdminClient();
    
    const teamsPromise = supabase.from('teams').select('*').order('name');
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

    const enrichedMembers: EnrichedMember[] = await Promise.all(members.map(async (member) => {
        const user = users.find(u => u.id === member.supabase_auth_user_id);
        const discordName = await getDiscordName(member.discord_uid);
        const displayName = discordName || user?.user_metadata.name || '名前不明';
        
        return {
            ...member,
            displayName,
            avatar_url: user?.user_metadata.avatar_url || null,
        }
    }));

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

    