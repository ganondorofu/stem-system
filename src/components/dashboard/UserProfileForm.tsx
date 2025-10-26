"use client";

import type { MemberWithTeams } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, GraduationCap, School, Building, Shield, Star } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useEffect, useState } from 'react';
import { getMemberDisplayName } from '@/lib/actions/members';
import { Skeleton } from '../ui/skeleton';

export function UserProfile({ user }: { user: MemberWithTeams }) {
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setIsLoading(true);
        if (user.discord_uid) {
            getMemberDisplayName(user.discord_uid)
                .then(name => {
                    setDisplayName(name || user.raw_user_meta_data?.name || '名前不明');
                })
                .catch(() => {
                    setDisplayName(user.raw_user_meta_data?.name || '名前不明');
                })
                .finally(() => {
                    setIsLoading(false);
                });
        } else {
             setDisplayName(user.raw_user_meta_data?.name || '名前不明');
             setIsLoading(false);
        }
    }, [user.discord_uid, user.raw_user_meta_data?.name]);
    
    const statusMap: { [key: number]: { label: string, icon: React.ElementType } } = {
      0: { label: "中学生", icon: School },
      1: { label: "高校生", icon: School },
      2: { label: "OB/OG", icon: GraduationCap }
    };
    
    const rawUsername = user.raw_user_meta_data?.user_name || user.raw_user_meta_data?.name || '不明';
    const discordUsername = rawUsername.split('#')[0];
    const { label: statusLabel, icon: StatusIcon } = statusMap[user.status] || { label: "不明", icon: User };

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center text-center space-y-2">
                <Avatar className="w-32 h-32 mb-2 border-4 border-primary/20 shadow-lg">
                    <AvatarImage src={user.avatar_url ?? undefined} alt={displayName ?? ''}/>
                    <AvatarFallback className="text-4xl"><User/></AvatarFallback>
                </Avatar>
                {isLoading ? <Skeleton className="h-8 w-40" /> : <h2 className="text-2xl font-bold font-headline">{displayName}</h2>}
                <p className="text-muted-foreground text-sm">@{discordUsername}</p>
                {user.is_admin && <Badge variant="destructive" className="mt-2"><Star className="w-3 h-3 mr-1"/>管理者</Badge>}
            </div>
            <div className="md:col-span-2 space-y-6">
                 <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">基本情報</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Building className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            <div>
                                <p className="text-sm text-muted-foreground">期</p>
                                <p className="font-semibold">{user.generation}期生</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center gap-4">
                            <StatusIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                            <div>
                                <p className="text-sm text-muted-foreground">ステータス</p>
                                <p className="font-semibold">{statusLabel}</p>
                            </div>
                        </div>
                        {user.student_number && (
                            <>
                                <Separator />
                                <div className="flex items-center gap-4">
                                    <School className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">学籍番号</p>
                                        <p className="font-semibold">{user.student_number}</p>
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-xl">所属情報</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="flex items-start gap-4">
                            <Shield className="w-5 h-5 text-muted-foreground mt-1 flex-shrink-0" />
                            <div>
                                <p className="text-sm text-muted-foreground">所属班</p>
                                {user.teams && user.teams.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {user.teams.map(team => (
                                            <Badge key={team.id} variant="secondary">{team.name}</Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="font-semibold">未所属</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
