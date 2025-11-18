import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import type { Member } from '@/lib/types';
import DashboardHeader from '@/components/layout/DashboardHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }
  
  let { data: memberProfile } = await supabase
    .from('members')
    .select('*')
    .eq('supabase_auth_user_id', user.id)
    .is('deleted_at', null)
    .single();

  const fullProfile: (Member & { raw_user_meta_data: any; avatar_url: string | null; }) | null = memberProfile ? {
    ...(memberProfile as Member),
    raw_user_meta_data: user.user_metadata,
    avatar_url: user.user_metadata.avatar_url,
  } : null;

  return (
    <div className="flex h-screen w-full bg-muted/20 md:grid md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <DashboardSidebar user={fullProfile} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <DashboardHeader user={fullProfile} />
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <div className="space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
