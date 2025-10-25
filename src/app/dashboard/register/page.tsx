"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { registerNewMember } from '@/lib/actions/members';

const registerSchema = z.object({
    generation: z.coerce.number().int().min(1, '期は正の整数である必要があります。'),
    student_number: z.string().optional().nullable(),
    status: z.coerce.number().int().min(0).max(1), // New members can only be Jr high or High school
});

export default function RegisterPage() {
    const { toast } = useToast();
    const router = useRouter();
    
    const form = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            status: 1, // Default to High School
        },
    });

    async function onSubmit(values: z.infer<typeof registerSchema>) {
        const result = await registerNewMember(values);
        if (result.error) {
            toast({
                title: '登録に失敗しました',
                description: result.error,
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'ようこそ！',
                description: '部員登録が完了しました。',
            });
            router.push('/dashboard');
            router.refresh(); // Refresh layout to get new user data
        }
    }
    
    const statusMap = {
      0: "中学生",
      1: "高校生",
    };

    return (
        <div className="flex items-center justify-center h-full">
            <Card className="w-full max-w-2xl">
                 <CardHeader>
                    <CardTitle>STEM研究部へようこそ！</CardTitle>
                    <CardDescription>最初にプロフィール情報を登録してください。この情報は後で変更できます。</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="generation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>期</FormLabel>
                                        <FormControl>
                                            <Input type="number" placeholder="例: 53" {...field} />
                                        </FormControl>
                                        <FormDescription>あなたの期を入力してください。（例: 53期生なら53）</FormDescription>
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
                                    <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
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
                                    <FormDescription>現在、中学生ですか、高校生ですか？</FormDescription>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
                                {form.formState.isSubmitting ? '登録中...' : '登録して始める'}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}
