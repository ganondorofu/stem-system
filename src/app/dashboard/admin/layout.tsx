import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { TriangleAlert } from 'lucide-react';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: member } = await supabase
    .from('members')
    .select('is_admin')
    .eq('supabase_auth_user_id', user.id)
    .single();

  if (!member || !member.is_admin) {
    return (
        <div className="flex items-center justify-center h-full">
            <Alert variant="destructive" className="max-w-md">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Access Denied</AlertTitle>
                <AlertDescription>
                You do not have permission to access this page. This section is for administrators only.
                </AlertDescription>
            </Alert>
        </div>
    );
  }

  return <>{children}</>;
}
