"use client";

import { useForm, useWatch } from 'react-hook-form';
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
import { useEffect, useMemo } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info } from 'lucide-react';

const registerSchema = z.object({
    name: z.string().min(1, '氏名は必須です。'),
    status: z.coerce.number().int().min(0).max(2),
    grade: z.coerce.number().int().min(1).max(3).optional(),
    student_number: z.string().optional().nullable(),
    generation: z.coerce.number().int().min(1, '期は正の整数である必要があります。').optional(),
}).refine(data => {
    if (data.status === 0 || data.status === 1) { // Junior High or High School
        return !!data.grade;
    }
    return true;
}, {
    message: '学年は必須です。',
    path: ['grade'],
}).refine(data => {
    if (data.status === 2) { // OB/OG
        return !!data.generation;
    }
    return true;
}, {
    message: '期は必須です。',
    path: ['generation'],
});

function getAcademicYear() {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth(); // 0-indexed (0 for January)
    return month >= 3 ? year : year - 1; // Academic year starts in April
}

function calculateGeneration(status: number, grade: number, academicYear: number) {
    if (status === 1) { // High School
        return 10 + (academicYear - 2025) - grade + 1;
    }
    if (status === 0) { // Junior High
        return 10 + (academicYear - 2025) + 4 - grade;
    }
    return null;
}

export default function RegisterPage() {
    const { toast } = useToast();
    const router = useRouter();
    const academicYear = getAcademicYear();

    const form = useForm<z.infer<typeof registerSchema>>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            status: 1, // Default to High School
        },
    });

    const watchedStatus = useWatch({ control: form.control, name: 'status' });
    const watchedGrade = useWatch({ control: form.control, name: 'grade' });

    const calculatedGeneration = useMemo(() => {
        if ((watchedStatus === 0 || watchedStatus === 1) && watchedGrade) {
            return calculateGeneration(watchedStatus, watchedGrade, academicYear);
        }
        return null;
    }, [watchedStatus, watchedGrade, academicYear]);

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
                description: '部員登録が完了しました。Discordの情報が同期されます。',
            });
            router.push('/dashboard');
            router.refresh(); 
        }
    }
    
    const statusMap = {
      0: "中学生",
      1: "高校生",
      2: "OB/OG"
    };

    return (
        <div className="flex items-center justify-center h-full p-4">
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
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>氏名</FormLabel>
                                        <FormControl>
                                            <Input placeholder="例: 山田太郎 (全角)" {...field} />
                                        </FormControl>
                                        <FormDescription>Discordのニックネームにも使用されます。スペースは含めないでください。</FormDescription>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                             <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>現在の身分</FormLabel>
                                    <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} defaultValue={String(field.value)}>
                                        <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="現在の身分を選択" />
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

                            {(watchedStatus === 0 || watchedStatus === 1) && (
                                <>
                                    <FormField
                                        control={form.control}
                                        name="grade"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>学年</FormLabel>
                                                 <Select onValueChange={(value) => field.onChange(parseInt(value, 10))} defaultValue={field.value ? String(field.value) : undefined}>
                                                    <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="学年を選択" />
                                                    </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="1">1年生</SelectItem>
                                                        <SelectItem value="2">2年生</SelectItem>
                                                        <SelectItem value="3">3年生</SelectItem>
                                                    </SelectContent>
                                                </Select>
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
                                                <FormDescription>Discordのニックネームに使用されます。</FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    {calculatedGeneration !== null && (
                                        <Alert>
                                            <Info className="h-4 w-4" />
                                            <AlertTitle>期生の確認</AlertTitle>
                                            <AlertDescription>
                                                {academicYear}年度の{watchedGrade}年生は、**{calculatedGeneration}期生**として登録されます。
                                            </AlertDescription>
                                        </Alert>
                                    )}
                                </>
                            )}
                            
                            {watchedStatus === 2 && (
                                <FormField
                                    control={form.control}
                                    name="generation"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>期</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="例: 50" {...field} value={field.value ?? ''} onChange={e => field.onChange(parseInt(e.target.value, 10) || undefined)} />
                                            </FormControl>
                                            <FormDescription>あなたの期を入力してください。（例: 50期生なら50）</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            )}

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

    