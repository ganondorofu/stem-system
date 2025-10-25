"use client";

import type { FullUserProfile } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, GraduationCap, School, Building } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

export function UserProfileForm({ user }: { user: FullUserProfile }) {
    const statusMap: { [key: number]: { label: string, icon: React.ElementType } } = {
      0: { label: "中学生", icon: School },
      1: { label: "高校生", icon: School },
      2: { label: "OB/OG", icon: GraduationCap }
    };
    
    const discordUsername = user.raw_user_meta_data?.user_name?.split('#')[0] || user.raw_user_meta_data?.name || '不明';
        
    const displayName = user.raw_user_meta_data.name || '名前不明';

    const { label: statusLabel, icon: StatusIcon } = statusMap[user.status] || { label: "不明", icon: User };

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <Card className="overflow-hidden">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <Avatar className="w-32 h-32 mb-4 border-4 border-primary/20">
                            <AvatarImage src={user.avatar_url ?? undefined} alt={displayName}/>
                            <AvatarFallback className="text-4xl"><User/></AvatarFallback>
                        </Avatar>
                        <h2 className="text-2xl font-bold font-headline">{displayName}</h2>
                        <p className="text-muted-foreground">@{discordUsername}</p>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2 space-y-4">
                 <Card>
                    <CardContent className="pt-6 space-y-4">
                        <div className="flex items-center gap-4">
                            <Building className="w-6 h-6 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">期</p>
                                <p className="font-semibold">{user.generation}期生</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <StatusIcon className="w-6 h-6 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">ステータス</p>
                                <p className="font-semibold">{statusLabel}</p>
                            </div>
                        </div>
                         {user.student_number && (
                            <div className="flex items-center gap-4">
                                <School className="w-6 h-6 text-muted-foreground" />
                                <div>
                                    <p className="text-sm text-muted-foreground">学籍番号</p>
                                    <p className="font-semibold">{user.student_number}</p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
                {user.is_admin && <Badge variant="destructive">管理者</Badge>}
            </div>
        </div>
    );
}
