"use client";

import type { MemberWithTeams } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, GraduationCap, School, Building, Shield, Star, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useEffect, useState } from 'react';
import { getMemberDisplayName, updateMyProfile } from '@/lib/actions/members';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

const profileFormSchema = z.object({
  student_number: z.string().regex(/^[0-9]*$/, '学籍番号は半角数字で入力してください。').optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export function UserProfile({ user }: { user: MemberWithTeams }) {
    const { toast } = useToast();
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [isLoadingName, setIsLoadingName] = useState(true);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            student_number: user.student_number || '',
        },
    });

    useEffect(() => {
        setIsLoadingName(true);
        if (user.discord_uid) {
            getMemberDisplayName(user.discord_uid)
                .then(name => {
                    setDisplayName(name || user.raw_user_meta_data?.name || '名前不明');
                })
                .catch(() => {
                    setDisplayName(user.raw_user_meta_data?.name || '名前不明');
                })
                .finally(() => {
                    setIsLoadingName(false);
                });
        } else {
             setDisplayName(user.raw_user_meta_data?.name || '名前不明');
             setIsLoadingName(false);
        }
    }, [user.discord_uid, user.raw_user_meta_data?.name]);
    
    const statusMap: { [key: number]: { label: string, icon: React.ElementType } } = {
      0: { label: "中学生", icon: School },
      1: { label: "高校生", icon: School },
      2: { label: "OB/OG", icon: GraduationCap }
    };
    
    const rawUsername = (user.raw_user_meta_data?.user_name || user.raw_user_meta_data?.name || '不明').split('#')[0];
    const { label: statusLabel, icon: StatusIcon } = statusMap[user.status] || { label: "不明", icon: User };

    const onSubmit = async (data: ProfileFormValues) => {
        const result = await updateMyProfile(data);
        if (result.error) {
            toast({
                title: '更新失敗',
                description: result.error,
                variant: 'destructive',
            });
        } else {
            toast({
                title: '更新成功',
                description: '学籍番号を更新しました。',
            });
             form.reset({ student_number: data.student_number });
        }
    }

    return (
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1 flex flex-col items-center text-center space-y-2">
                <Avatar className="w-32 h-32 mb-2 border-4 border-primary/20 shadow-lg">
                    <AvatarImage src={user.avatar_url ?? undefined} alt={displayName ?? ''}/>
                    <AvatarFallback className="text-4xl"><User/></AvatarFallback>
                </Avatar>
                {isLoadingName ? <Skeleton className="h-8 w-40" /> : <h2 className="text-2xl font-bold font-headline">{displayName}</h2>}
                <p className="text-muted-foreground text-sm">@{rawUsername}</p>
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
                        {user.status !== 2 && ( // OB/OGでない場合のみ表示
                            <>
                                <Separator />
                                <Form {...form}>
                                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                                        <FormField
                                            control={form.control}
                                            name="student_number"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className='flex items-center gap-4'>
                                                        <School className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                                                        <span className="text-sm text-muted-foreground">学籍番号</span>
                                                    </FormLabel>
                                                    <FormControl>
                                                        <div className="flex gap-2 items-center">
                                                            <Input placeholder="学籍番号を入力" {...field} value={field.value || ''} className="max-w-xs" />
                                                            <Button type="submit" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
                                                                {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                                更新
                                                            </Button>
                                                        </div>
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </form>
                                </Form>
                            </>
                        )}
                         <div className="pt-2">
                             <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <Edit className="mr-2 h-4 w-4"/>
                                        その他の情報の変更申請
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                    <AlertDialogTitle>プロフィール情報の変更について</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        学籍番号以外の情報（氏名、期、ステータスなど）の変更は、Discord等で役員に連絡してください。
                                    </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                    <AlertDialogAction>閉じる</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
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
