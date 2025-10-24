import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserProfileForm } from '@/components/dashboard/UserProfileForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FullUserProfile } from '@/lib/types';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

export default async function ProfilePage({ searchParams }: { searchParams: { new?: string }}) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        redirect('/login');
    }

    const { data: memberProfile } = await supabase
        .from('members')
        .select('*')
        .eq('supabase_auth_user_id', user.id)
        .single();
    
    if (!memberProfile) {
        return redirect('/login?error=profile_not_found');
    }

    const fullProfile: FullUserProfile = {
      ...memberProfile,
      raw_user_meta_data: user.user_metadata,
    };

    const isNewUser = searchParams.new === 'true';

    return (
        <div className="space-y-4">
            {isNewUser && (
                <Alert className="bg-accent/30 border-accent/50">
                    <Info className="h-4 w-4" />
                    <AlertTitle>STEM研究部へようこそ！</AlertTitle>
                    <AlertDescription>
                        最初にプロフィール情報を入力してください。
                    </AlertDescription>
                </Alert>
            )}
            <Card>
                <CardHeader>
                    <CardTitle>マイプロフィール</CardTitle>
                    <CardDescription>個人情報を表示・編集します。この情報は他の部員にも表示されます。</CardDescription>
                </CardHeader>
                <CardContent>
                    <UserProfileForm user={fullProfile} />
                </CardContent>
            </Card>
        </div>
    );
}
