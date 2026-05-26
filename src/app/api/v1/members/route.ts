import { NextRequest, NextResponse } from 'next/server';
import { requireBearerAuth } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = requireBearerAuth(request);
  if (auth instanceof Response) return auth;

  const supabase = await createAdminClient();

  // 管理者チェック
  const { data: caller } = await supabase
    .from('members')
    .select('is_admin')
    .eq('supabase_auth_user_id', auth.sub)
    .single();

  if (!caller?.is_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  const { data: members } = await supabase
    .from('members')
    .select(`
      supabase_auth_user_id,
      discord_uid,
      discord_username,
      generation,
      status,
      is_admin,
      student_number,
      joined_at,
      deleted_at,
      member_team_relations ( team_id, teams ( id, name ) )
    `)
    .order('generation', { ascending: false });

  return NextResponse.json(
    members?.map((m) => ({
      id: m.supabase_auth_user_id,
      display_name: null,
      discord_uid: m.discord_uid,
      discord_username: m.discord_username,
      generation: m.generation,
      status: m.status,
      is_admin: m.is_admin,
      student_number: m.student_number,
      joined_at: m.joined_at,
      deleted_at: m.deleted_at,
      teams: m.member_team_relations
        ?.map((r: any) => r.teams)
        .filter(Boolean) ?? [],
    })) ?? []
  );
}
