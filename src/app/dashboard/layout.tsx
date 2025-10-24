import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import DashboardSidebar from '@/components/layout/DashboardSidebar';
import type { FullUserProfile } from '@/lib/types';
import DashboardHeader from '@/components/layout/DashboardHeader';
import { revalidatePath } from 'next/cache';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }
  
  let { data: memberProfile } = await supabase
    .from('members')
    .select('*')
    .eq('supabase_auth_user_id', user.id)
    .single();

  if (!memberProfile) {
    const { data: newMember, error: insertError } = await supabase
      .from('members')
      .insert({
        supabase_auth_user_id: user.id,
        discord_uid: user.user_metadata.provider_id,
        avatar_url: user.user_metadata.avatar_url,
        status: 1, // Default to High School
        generation: 0, // Placeholder, user must update
        is_admin: false, // Default to non-admin
      })
      .select()
      .single();

    if (insertError || !newMember) {
      console.error("Error creating member profile:", insertError);
      // It's better to show an error page or message than to redirect to login with a generic error
      return redirect(`/login?error=${insertError?.message ?? 'Could not create user profile.'}`);
    }
    memberProfile = newMember;
    // Revalidate the path to ensure new data is fetched.
    revalidatePath('/dashboard', 'layout');
    // Redirect to the profile page for the new user to complete their profile.
    return redirect('/dashboard?new=true');
  }

  const fullProfile: FullUserProfile = {
    ...memberProfile,
    raw_user_meta_data: user.user_metadata,
  };

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
