"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { syncAllDiscordRoles, graduateGeneration, updateStatusesForNewAcademicYear } from '@/lib/actions/members';
import { Loader2, UserCog, GraduationCap, RefreshCw } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

const graduateSchema = z.object({
  generation: z.coerce.number().int().positive('期数は正の整数である必要があります。'),
});

const newYearSchema = z.object({
    highSchoolFirstYearGeneration: z.coerce.number().int().positive('期数は正の整数である必要があります。'),
});

export function SystemTasksClient() {
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isGraduating, setIsGraduating] = useState(false);
    const [isUpdatingYear, setIsUpdatingYear] = useState(false);

    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertAction, setAlertAction] = useState<'sync' | 'graduate' | 'newYear' | null>(null);
    
    const graduateForm = useForm<z.infer<typeof graduateSchema>>({
        resolver: zodResolver(graduateSchema),
    });
    const newYearForm = useForm<z.infer<typeof newYearSchema>>({
        resolver: zodResolver(newYearSchema),
    });

    const handleSyncClick = () => {
        setAlertAction('sync');
        setIsAlertOpen(true);
    };

    const handleGraduateSubmit = (values: z.infer<typeof graduateSchema>) => {
        graduateForm.setValue('generation', values.generation);
        setAlertAction('graduate');
        setIsAlertOpen(true);
    };
    
    const handleNewYearSubmit = (values: z.infer<typeof newYearSchema>) => {
        newYearForm.setValue('highSchoolFirstYearGeneration', values.highSchoolFirstYearGeneration);
        setAlertAction('newYear');
        setIsAlertOpen(true);
    };

    const executeAction = async () => {
        if (!alertAction) return;

        if (alertAction === 'sync') {
            setIsSyncing(true);
            const result = await syncAllDiscordRoles();
            toast({
                title: result.error ? 'エラー' : '成功',
                description: result.error ? `ロールの同期に失敗しました: ${result.error}` : result.message,
                variant: result.error ? 'destructive' : 'default',
            });
            setIsSyncing(false);
        }

        if (alertAction === 'graduate') {
            const generation = graduateForm.getValues('generation');
            setIsGraduating(true);
            const result = await graduateGeneration(generation);
            toast({
                title: result.error ? 'エラー' : '成功',
                description: result.error ? `卒業処理に失敗しました: ${result.error}` : `${generation}期の${result.count}人をOB/OGに更新しました。`,
                variant: result.error ? 'destructive' : 'default',
            });
            setIsGraduating(false);
            graduateForm.reset();
        }
        
        if (alertAction === 'newYear') {
            const generation = newYearForm.getValues('highSchoolFirstYearGeneration');
            setIsUpdatingYear(true);
            const result = await updateStatusesForNewAcademicYear(generation);
            toast({
                title: result.error ? 'エラー' : '成功',
                description: result.error ? `年度更新に失敗しました: ${result.error}` : result.message,
                variant: result.error ? 'destructive' : 'default',
            });
            setIsUpdatingYear(false);
            newYearForm.reset();
        }

        setIsAlertOpen(false);
        setAlertAction(null);
    };

    const getAlertDescription = () => {
        if (alertAction === 'sync') {
            return '全メンバーのDiscordロールをデータベースの情報に基づいて更新します。この処理は完了まで数分かかる場合があります。本当に実行しますか？';
        }
        if (alertAction === 'graduate') {
            const generation = graduateForm.getValues('generation');
            return `${generation}期に所属する全ての現役メンバーのステータスを「OB/OG」に変更します。この操作は元に戻せません。本当によろしいですか？`;
        }
        if (alertAction === 'newYear') {
            const generation = newYearForm.getValues('highSchoolFirstYearGeneration');
            return `現在の高校1年生を「${generation}期」として、全メンバーのステータス（中学生, 高校生, OB/OG）を一括更新します。この操作は元に戻せません。本当によろしいですか？`;
        }
        return '';
    };

    return (
        <div className="space-y-8">
             <Card className="border-primary/50">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <RefreshCw className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>年度更新</CardTitle>
                            <CardDescription>
                                新年度に合わせて、全メンバーのステータス（中学生、高校生、OB/OG）を一括で更新します。
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        年度の初めに一度だけ実行してください。「現在の高校1年生の期」を入力すると、それを基準に全メンバーのステータスが自動計算され、更新されます。
                    </p>
                    <Form {...newYearForm}>
                        <form onSubmit={newYearForm.handleSubmit(handleNewYearSubmit)} className="flex items-end gap-4">
                            <FormField
                                control={newYearForm.control}
                                name="highSchoolFirstYearGeneration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>現在の高校1年生の期</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="例: 12"
                                                {...field}
                                                className="w-40"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" variant="default" disabled={isUpdatingYear}>
                                {isUpdatingYear ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        更新中...
                                    </>
                                ) : (
                                    '年度更新を実行'
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <Separator />
            
            <Card className="bg-background/50">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <UserCog className="h-8 w-8 text-primary" />
                        <div>
                            <CardTitle>全メンバーのDiscordロールを同期</CardTitle>
                            <CardDescription>
                                データベースの情報に基づき、全メンバーのDiscordロールを強制的に最新の状態に更新します。
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        メンバーのロールがDiscord上で正しく反映されていない場合や、年度更新後に手動で調整したい場合に実行してください。処理にはメンバーの数に応じて時間がかかります。
                    </p>
                    <Button onClick={handleSyncClick} disabled={isSyncing}>
                        {isSyncing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                同期中...
                            </>
                        ) : (
                            '全ロールを同期'
                        )}
                    </Button>
                </CardContent>
            </Card>

            <Separator />

            <Card className="border-destructive/50">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <GraduationCap className="h-8 w-8 text-destructive" />
                        <div>
                            <CardTitle>【旧機能】期生をOB/OGに更新（卒業処理）</CardTitle>
                            <CardDescription>
                                指定した期数のメンバー全員を「OB/OG」ステータスに一括で変更します。
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        通常は上記の「年度更新」機能を使用してください。この機能は、特定の期だけを手動で卒業させたい場合などの特殊な状況でのみ使用します。この操作は元に戻せません。
                    </p>
                    <Form {...graduateForm}>
                        <form onSubmit={graduateForm.handleSubmit(handleGraduateSubmit)} className="flex items-end gap-4">
                            <FormField
                                control={graduateForm.control}
                                name="generation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>期数</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="例: 10"
                                                {...field}
                                                className="w-32"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" variant="destructive" disabled={isGraduating}>
                                {isGraduating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        更新中...
                                    </>
                                ) : (
                                    'OB/OGに更新'
                                )}
                            </Button>
                        </form>
                    </Form>
                </CardContent>
            </Card>

            <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>本当に実行しますか？</AlertDialogTitle>
                        <AlertDialogDescription>
                            {getAlertDescription()}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>キャンセル</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={executeAction}
                            className={alertAction === 'graduate' ? 'bg-destructive hover:bg-destructive/90' : ''}
                        >
                            実行
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
