"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Club, Home, Users, Shield, BookMarked, LogOut, User } from 'lucide-react';
import type { FullUserProfile } from '@/lib/types';
import { createClient } from '@/lib/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

const navItems = [
  { href: '/dashboard', label: 'マイプロフィール', icon: Home, admin: false },
  { href: '/dashboard/admin/members', label: 'メンバー管理', icon: Users, admin: true },
  { href: '/dashboard/admin/teams', label: '班管理', icon: Shield, admin: true },
  { href: '/dashboard/admin/generations', label: '期別ロール管理', icon: BookMarked, admin: true },
];

export default function DashboardHeader({ user }: { user: FullUserProfile | null }) {
  const pathname = usePathname();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  
  const isAdmin = user?.is_admin ?? false;

  return (
    <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 md:hidden">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="shrink-0">
            <Menu className="h-5 w-5" />
            <span className="sr-only">ナビゲーションメニューを開閉</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="flex flex-col">
          <nav className="grid gap-2 text-lg font-medium">
            <Link href="#" className="flex items-center gap-2 text-lg font-semibold mb-4">
              <Club className="h-6 w-6 text-primary" />
              <span className="sr-only">STEM研究部</span>
            </Link>
            {user && navItems.map((item) => {
              if (item.admin && !isAdmin) return null;
              const isActive = item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mx-[-0.65rem] flex items-center gap-4 rounded-xl px-3 py-2 hover:text-foreground ${
                    isActive ? 'bg-muted text-foreground' : 'text-muted-foreground'
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto">
             {user && (
                <div className="flex items-center gap-3 mb-4">
                <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.name} />
                    <AvatarFallback><User /></AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <p className="font-semibold text-sm leading-none">{user.name}</p>
                    <p className="text-xs text-muted-foreground">{isAdmin ? '管理者' : 'メンバー'}</p>
                </div>
                </div>
             )}
            <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              ログアウト
            </Button>
          </div>
        </SheetContent>
      </Sheet>
      <div className="w-full flex-1">
        {/* Can add breadcrumbs here if needed */}
      </div>
    </header>
  );
}

    