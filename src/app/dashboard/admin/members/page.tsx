import { createClient } from '@/lib/supabase/server';
import { MemberManagementClient } from '@/components/dashboard/admin/MemberManagementClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FullUserProfile, Team } from '@/lib/types';

async function getMembersData() {
    const supabase = createClient();
    
    // Fetch all non-deleted members
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

    // Since we cannot join auth.users, we have to live without the full name for now
    // in this server component. A more advanced setup might use database functions.
    // We will pass the members data and let the client component enhance it if needed.
    const profiles: Omit<FullUserProfile, 'raw_user_meta_data'>[] = members;

    // Fetch all teams
    const { data: teams, error: teamsError } = await supabase.from('teams').select('*');
    if (teamsError) {
        console.error('Error fetching teams:', teamsError);
    }
    
    return {
        profiles: profiles || [],
        teams: (teams as Team[]) || [],
    };
}

export default async function MemberManagementPage() {
    const { profiles, teams } = await getMembersData();
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Member Management</CardTitle>
                <CardDescription>Manage all club members, their roles, and status.</CardDescription>
            </CardHeader>
            <CardContent>
                <MemberManagementClient initialMembers={profiles} allTeams={teams} />
            </CardContent>
        </Card>
    );
}
