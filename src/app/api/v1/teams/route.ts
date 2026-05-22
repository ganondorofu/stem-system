import { NextRequest, NextResponse } from 'next/server';
import { requireBearerAuth } from '@/lib/api-auth';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const auth = requireBearerAuth(request);
  if (auth instanceof Response) return auth;

  const supabase = await createAdminClient();

  const { data: teams } = await supabase
    .from('teams')
    .select(`
      id,
      name,
      member_team_relations ( member_id, members ( supabase_auth_user_id, generation, status, discord_username ) )
    `)
    .order('name');

  return NextResponse.json(
    teams?.map((t) => ({
      id: t.id,
      name: t.name,
      members: t.member_team_relations
        ?.map((r: any) => ({
          id: r.members?.supabase_auth_user_id,
          generation: r.members?.generation,
          status: r.members?.status,
          display_name: r.members?.discord_username || null,
        }))
        .filter((m: any) => m.id) ?? [],
    })) ?? []
  );
}
