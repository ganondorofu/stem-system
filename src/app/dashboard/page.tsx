import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserProfile } from '@/components/dashboard/UserProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DiscordMemberStatus, Team, MemberWithTeams } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, TriangleAlert, Server, LogIn, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ReSyncForm } from '@/components/dashboard/ReSyncForm';

async function getDiscordMemberStatus(discordUid: string): Promise<DiscordMemberStatus | null> {
    const apiUrl = process.env.NEXT_PUBLIC_STEM_BOT_API_URL;
    const token = process.env.STEM_BOT_API_BEARER_TOKEN;

    if (!apiUrl || !token) {
        console.error('API URL or Bearer Token is not configured.');
        return null;
    }

    try {
        const response = await fetch(`${apiUrl}/api/member/status?discord_uid=${discordUid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            cache: 'no-store', // Always fetch fresh data
        });

        if (!response.ok) {
            if(response.status === 404){
                 return {
                    discord_uid: discordUid,
                    is_in_server: false,
                    current_nickname: null,
                    current_roles: [],
                 }
            }
            console.error('Failed to fetch member status:', response.status, await response.text());
            return null;
        }
        
        return await response.json();
    } catch (error) {
        console.error('Error fetching member status:', error);
        return null;
    }
}


export default async function DashboardGatePage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return redirect('/login');
    }

    const discordUid = user.user_metadata.provider_id;
    if (!discordUid) {
        return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>エラー</AlertTitle>
                <AlertDescription>DiscordのユーザーIDが取得できませんでした。再ログインしてください。</AlertDescription>
            </Alert>
        );
    }
    
    const discordStatus = await getDiscordMemberStatus(discordUid);

    if (!discordStatus) {
         return (
            <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>APIエラー</AlertTitle>
                <AlertDescription>Discordサーバーとの連携状態を確認できませんでした。管理者にお問い合わせください。</AlertDescription>
            </Alert>
        );
    }

    if (!discordStatus.is_in_server) {
        return (
            <Card className="w-full max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle>Discordサーバーに参加してください</CardTitle>
                    <CardDescription>
                        このシステムを利用するには、まずSTEM研究部のDiscordサーバーに参加する必要があります。
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                     <Alert>
                        <LogIn className="h-4 w-4" />
                        <AlertTitle>ステップ1: サーバーに参加</AlertTitle>
                        <AlertDescription>
                            下のボタンからDiscordサーバーに参加してください。
                        </AlertDescription>
                    </Alert>
                     <Button asChild className="w-full">
                        <a href={process.env.NEXT_PUBLIC_DISCORD_INVITE_URL || 'https://discord.gg/your-invite-link'} target="_blank" rel="noopener noreferrer">
                            <Server className="mr-2 h-4 w-4" />
                            Discordサーバーに参加する
                        </a>
                    </Button>
                    <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>ステップ2: 参加確認</AlertTitle>
                        <AlertDescription>
                            サーバーに参加したら、このページを再読み込みしてください。
                        </AlertDescription>
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    // Check if user has "連携済み" role (configurable via env)
    const linkedRoleName = process.env.NEXT_PUBLIC_DISCORD_LINKED_ROLE_NAME || '連携済み';
    const hasLinkedRole = discordStatus.current_roles?.includes(linkedRoleName) ?? false;

    const { data: memberProfile } = await supabase
        .from('members')
        .select('*')
        .eq('supabase_auth_user_id', user.id)
        .is('deleted_at', null)
        .single();
    
    // If user is in server but doesn't have linked role and has a profile, show re-sync form
    if (!hasLinkedRole && memberProfile) {
        return (
            <Card className="w-full max-w-lg mx-auto">
                <CardHeader>
                    <CardTitle>Discord連携が必要です</CardTitle>
                    <CardDescription>
                        Discordサーバーには参加していますが、連携が完了していません。
                        姓名を入力してDiscord連携を再設定してください。
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                    <Alert>
                        <Link2 className="h-4 w-4" />
                        <AlertTitle>Discord連携が未完了</AlertTitle>
                        <AlertDescription>
                            以前サーバーを脱退した、またはロールが削除された可能性があります。
                            下記のフォームから再連携してください。
                        </AlertDescription>
                    </Alert>
                    <ReSyncForm />
                </CardContent>
            </Card>
        );
    }
    
    if (!memberProfile) {
        return redirect('/dashboard/register');
    }

    const { data: teamRelations } = await supabase
        .from('member_team_relations')
        .select('team_id')
        .eq('member_id', user.id);
    
    const teamIds = teamRelations?.map(r => r.team_id) || [];
    let teams: Team[] = [];
    if (teamIds.length > 0) {
        const { data: teamsData } = await supabase
            .from('teams')
            .select('*')
            .in('id', teamIds);
        teams = teamsData || [];
    }
    
    const profileWithTeams: MemberWithTeams = {
        ...memberProfile,
        teams: teams,
        raw_user_meta_data: user.user_metadata,
    };


    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>マイプロフィール</CardTitle>
                    <CardDescription>あなたの登録情報です。この情報は他の部員にも共有されます。</CardDescription>
                </CardHeader>
                <CardContent>
                    <UserProfile user={profileWithTeams} />
                </CardContent>
            </Card>
        </div>
    );
}
