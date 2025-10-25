"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FullUserProfile } from '@/lib/types';
import { updateMyProfile } from '@/lib/actions/members';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const profileSchema = z.object({
    generation: z.coerce.number().int().min(1, '期は正の整数である必要があります。'),
    student_number: z.string().optional().nullable(),
    status: z.coerce.number().int().min(0).max(2),
});

export function UserProfileForm({ user }: { user: FullUserProfile }) {
    const { toast } = useToast();
    
    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            generation: user.generation || undefined,
            student_number: user.student_number,
            status: user.status,
        },
    });

    async function onSubmit(values: z.infer<typeof profileSchema>) {
        const result = await updateMyProfile(values);
        if (result.error) {
            toast({
                title: 'プロフィールの更新に失敗しました',
                description: result.error,
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'プロフィール更新完了',
                description: '変更が正常に保存されました。Discordの情報も同期されます。',
            });
        }
    }
    
    const statusMap = {
      0: "中学生",
      1: "高校生",
      2: "OB/OG"
    };
    
    const discordUsername = user.raw_user_meta_data?.user_name?.split('#')[0] || user.raw_user_meta_data?.full_name?.split('#')[0] || user.raw_user_meta_data?.name || '不明';

    return (
        <div className="grid md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <Card className="overflow-hidden">
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                        <Avatar className="w-32 h-32 mb-4 border-4 border-primary/20">
                            <AvatarImage src={user.avatar_url ?? undefined} alt={user.raw_user_meta_data.name}/>
                            <AvatarFallback className="text-4xl"><User/></AvatarFallback>
                        </Avatar>
                        <h2 className="text-2xl font-bold font-headline">{user.raw_user_meta_data.name}</h2>
                        <p className="text-muted-foreground">@{discordUsername}</p>
                        <p className="text-muted-foreground text-sm mt-2">{new Date(user.joined_at).toLocaleDateString()} に参加</p>
                    </CardContent>
                </Card>
            </div>
            <div className="md:col-span-2">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        <FormField
                            control={form.control}
                            name="generation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>期</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="例: 50" {...field} />
                                    </FormControl>
                                    <FormDescription>あなたの期を入力してください。</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="student_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>学籍番号</FormLabel>
                                    <FormControl>
                                        <Input placeholder="あなたの学籍番号" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormDescription>任意入力です。</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>ステータス</FormLabel>
                                <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} defaultValue={String(field.value)}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="現在のステータスを選択" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {Object.entries(statusMap).map(([value, label]) => (
                                            <SelectItem key={value} value={value}>{label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? '保存中...' : '変更を保存'}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}
