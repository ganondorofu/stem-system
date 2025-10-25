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

  // New user registration is now handled on the dashboard page
  // We only build a partial profile here if the user exists
  const fullProfile: (Member & { raw_user_meta_data: any }) | null = memberProfile ? {
    ...(memberProfile as Member),
    raw_user_meta_data: user.user_metadata,
  } : null;

  return (
    <div className="grid min-h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <DashboardSidebar user={fullProfile} />
      <div className="flex flex-col">
        <DashboardHeader user={fullProfile} />
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6 bg-muted/20">
          {children}
        </main>
      </div>
    </div>
  );
}
