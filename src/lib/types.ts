export type Member = {
  supabase_auth_user_id: string;
  status: number;
  generation: number;
  student_number: string | null;
  discord_uid: string;
  avatar_url: string | null;
  is_admin: boolean;
  joined_at: string;
  deleted_at: string | null;
  raw_user_meta_data: {
    [key: string]: any;
  };
};

export type Team = {
  id: string;
  name: string;
  discord_role_id: string;
};

export type MemberTeamRelation = {
  member_id: string;
  team_id: string;
};

export type TeamLeader = {
  team_id: string;
  member_id: string;
};

export type GenerationRole = {
  generation: number;
  discord_role_id: string;
};

export type FullUserProfile = Member;

export type MemberWithTeams = Member & {
  teams: Team[];
};

export type MemberWithTeamsAndRelations = MemberWithTeams & {
  name: string;
  relations: MemberTeamRelation[];
}


export type DiscordMemberStatus = {
  discord_uid: string;
  is_in_server: boolean;
  current_nickname: string | null;
  current_roles: string[];
};
