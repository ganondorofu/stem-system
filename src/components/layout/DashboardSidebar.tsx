"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { FullUserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Club, LogOut, User, Users, Shield, Home, Settings } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Skeleton } from '../ui/skeleton';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/dashboard', label: 'マイプロフィール', icon: Home, admin: false },
  { href: '/dashboard/admin/members', label: 'メンバー管理', icon: Users, admin: true },
  { href: '/dashboard/admin/teams', label: '班管理', icon: Shield, admin: true },
];

export default function DashboardSidebar({ user }: { user: FullUserProfile | null }) {
  const pathname = usePathname();
  const supabase = createClient();
  const [displayName, setDisplayName] = useState(user?.raw_user_meta_data?.name);

  useEffect(() => {
    // This is just a fallback, the name should be in raw_user_meta_data
    if (user && !displayName) {
        setDisplayName(user.raw_user_meta_data?.name);
    }
  }, [user, displayName]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  
  const isAdmin = user?.is_admin ?? false;

  return (
    <div className="hidden border-r bg-card md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Club className="h-6 w-6 text-primary" />
            <span className="font-headline">STEM研究部</span>
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {user && navItems.map((item) => {
              if (item.admin && !isAdmin) return null;
              const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                    isActive ? 'bg-muted text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="mt-auto p-4">
          <Separator className="my-4" />
           {user ? (
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url ?? undefined} alt={displayName} />
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
              <div className="flex flex-col overflow-hidden">
                <p className="font-semibold text-sm leading-none truncate">{displayName}</p>
                <p className="text-xs text-muted-foreground">{isAdmin ? '管理者' : 'メンバー'}</p>
              </div>
            </div>
           ): (
             <div className="flex items-center gap-3 mb-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                </div>
            </div>
           )}
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
          </Button>
        </div>
      </div>
    </div>
  );
}
