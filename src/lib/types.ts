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
};

export type EnrichedMember = Omit<Member, "status" | "joined_at" | "deleted_at" | "is_admin"> & {
  displayName: string;
  avatar_url: string | null;
}

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

export type MemberWithTeams = Member & {
  teams: Team[];
   raw_user_meta_data: {
    [key: string]: any;
  };
};

export type FullUserProfile = Member & {
    raw_user_meta_data: any;
};

export type MemberWithTeamsAndRelations = Member & {
  relations: MemberTeamRelation[];
  teams: Team[];
  raw_user_meta_data: { [key: string]: any };
  email: string | null;
}

export type DiscordMemberStatus = {
  discord_uid: string;
  is_in_server: boolean;
  current_nickname: string | null;
  current_roles: string[];
};
