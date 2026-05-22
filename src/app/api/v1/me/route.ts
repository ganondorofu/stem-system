import { NextRequest, NextResponse } from 'next/server';
import { requireBearerAuth } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = requireBearerAuth(request);
  if (auth instanceof Response) return auth;

  const supabase = await createAdminClient();
  const { data: member } = await supabase
    .from('members')
    .select(`
      supabase_auth_user_id,
      display_name,
      discord_uid,
      discord_username,
      generation,
      status,
      is_admin,
      avatar_url,
      joined_at,
      member_team_relations ( team_id, teams ( id, name ) )
    `)
    .eq('supabase_auth_user_id', auth.sub)
    .is('deleted_at', null)
    .single();

  if (!member) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  return NextResponse.json({
    id: member.supabase_auth_user_id,
    display_name: member.display_name,
    discord_uid: member.discord_uid,
    discord_username: member.discord_username,
    generation: member.generation,
    status: member.status,
    is_admin: member.is_admin,
    avatar_url: member.avatar_url,
    joined_at: member.joined_at,
    teams: member.member_team_relations
      ?.map((r: any) => r.teams)
      .filter(Boolean) ?? [],
  });
}
