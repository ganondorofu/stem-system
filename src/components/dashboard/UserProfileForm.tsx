"use client";

import type { MemberWithTeams, Team } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User, GraduationCap, School, Building, Shield, Star, Edit } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { useEffect, useState } from 'react';
import { getMemberDisplayName, setMyTeams, updateMyProfile } from '@/lib/actions/members';
import { Skeleton } from '../ui/skeleton';
import { Button } from '../ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '../ui/form';
import { Input } from '../ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { ScrollArea } from '../ui/scroll-area';
import { useRouter } from 'next/navigation';
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

const teamsFormSchema = z.object({
    team_ids: z.array(z.string()).min(1, '1つ以上の班を選択してください。'),
});

type TeamsFormValues = z.infer<typeof teamsFormSchema>;

export function UserProfile({ user, allTeams = [] }: { user: MemberWithTeams, allTeams?: Team[] }) {
    const { toast } = useToast();
    const router = useRouter();
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [isLoadingName, setIsLoadingName] = useState(true);

    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileFormSchema),
        defaultValues: {
            student_number: user.student_number || '',
        },
    });

    const teamsForm = useForm<TeamsFormValues>({
        resolver: zodResolver(teamsFormSchema),
        defaultValues: { team_ids: [] },
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
    
    const rawUsername = user.discord_username || user.raw_user_meta_data?.full_name || '不明';
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

    const canSelfAssignTeams = (user.teams?.length ?? 0) === 0 && allTeams.length > 0;

    const onTeamsSubmit = async (data: TeamsFormValues) => {
        const result = await setMyTeams({ team_ids: data.team_ids });
        if (result.error) {
            toast({
                title: '班の設定に失敗しました',
                description: result.error,
                variant: 'destructive',
            });
        } else {
            toast({
                title: '所属班を設定しました',
                description: '以降の変更は管理者に依頼してください。',
            });
            router.refresh();
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
                            <div className="flex-1">
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
                        {canSelfAssignTeams && (
                            <>
                                <Separator className="my-4" />
                                <Form {...teamsForm}>
                                    <form onSubmit={teamsForm.handleSubmit(onTeamsSubmit)} className="space-y-4">
                                        <FormField
                                            control={teamsForm.control}
                                            name="team_ids"
                                            render={() => (
                                                <FormItem>
                                                    <div className="mb-2">
                                                        <FormLabel className="text-base">所属する班を選択</FormLabel>
                                                        <FormDescription>
                                                            参加する班をすべて選択してください。<strong>この操作は1度しか行えません。</strong>
                                                            設定後の変更は管理者に依頼する必要があります。
                                                        </FormDescription>
                                                    </div>
                                                    <ScrollArea className="h-40 w-full rounded-md border">
                                                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                            {allTeams.map((team) => (
                                                                <FormField
                                                                    key={team.id}
                                                                    control={teamsForm.control}
                                                                    name="team_ids"
                                                                    render={({ field }) => (
                                                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                                                                            <FormControl>
                                                                                <Checkbox
                                                                                    checked={field.value?.includes(team.id)}
                                                                                    onCheckedChange={(checked) => {
                                                                                        return checked
                                                                                            ? field.onChange([...(field.value || []), team.id])
                                                                                            : field.onChange(field.value?.filter((value) => value !== team.id));
                                                                                    }}
                                                                                />
                                                                            </FormControl>
                                                                            <FormLabel className="font-normal">{team.name}</FormLabel>
                                                                        </FormItem>
                                                                    )}
                                                                />
                                                            ))}
                                                        </div>
                                                    </ScrollArea>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                        <Button type="submit" disabled={teamsForm.formState.isSubmitting}>
                                            {teamsForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                            所属班を確定する
                                        </Button>
                                    </form>
                                </Form>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
