"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { FullUserProfile } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Club, LogOut, User, Users, Shield, BookMarked, Home, Settings } from 'lucide-react';
import { Separator } from '../ui/separator';

const navItems = [
  { href: '/dashboard', label: 'マイプロフィール', icon: Home, admin: false },
  { href: '/dashboard/admin/members', label: 'メンバー管理', icon: Users, admin: true },
  { href: '/dashboard/admin/teams', label: '班管理', icon: Shield, admin: true },
  { href: '/dashboard/admin/generations', label: '期別ロール', icon: BookMarked, admin: true },
];

export default function DashboardSidebar({ user }: { user: FullUserProfile }) {
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  return (
    <div className="hidden border-r bg-card md:block">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <Club className="h-6 w-6 text-primary" />
            <span className="font-headline">STEM研究部</span>
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => {
              if (item.admin && !user.is_admin) return null;
              const isActive = pathname.startsWith(item.href) && (item.href !== '/dashboard' || pathname === '/dashboard');
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
           <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar_url ?? undefined} alt={user.raw_user_meta_data.name} />
                <AvatarFallback><User /></AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <p className="font-semibold text-sm leading-none">{user.raw_user_meta_data.name}</p>
                <p className="text-xs text-muted-foreground">{user.is_admin ? '管理者' : 'メンバー'}</p>
              </div>
            </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            ログアウト
          </Button>
        </div>
      </div>
    </div>
  );
}
