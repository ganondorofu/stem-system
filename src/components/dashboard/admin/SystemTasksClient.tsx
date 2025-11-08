"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { syncAllDiscordRoles, graduateGeneration } from '@/lib/actions/members';
import { Loader2, UserCog, GraduationCap } from 'lucide-react';
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

export function SystemTasksClient() {
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isGraduating, setIsGraduating] = useState(false);
    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertAction, setAlertAction] = useState<'sync' | 'graduate' | null>(null);
    const [generationToGraduate, setGenerationToGraduate] = useState<number | null>(null);

    const form = useForm<z.infer<typeof graduateSchema>>({
        resolver: zodResolver(graduateSchema),
    });

    const handleSyncClick = () => {
        setAlertAction('sync');
        setIsAlertOpen(true);
    };

    const handleGraduateSubmit = (values: z.infer<typeof graduateSchema>) => {
        setGenerationToGraduate(values.generation);
        setAlertAction('graduate');
        setIsAlertOpen(true);
    };

    const executeAction = async () => {
        if (!alertAction) return;

        if (alertAction === 'sync') {
            setIsSyncing(true);
            const result = await syncAllDiscordRoles();
            if (result.error) {
                toast({
                    title: 'エラー',
                    description: `ロールの同期に失敗しました: ${result.error}`,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: '成功',
                    description: `${result.count}人のメンバーのDiscordロール同期を開始しました。`,
                });
            }
            setIsSyncing(false);
        }

        if (alertAction === 'graduate' && generationToGraduate !== null) {
            setIsGraduating(true);
            const result = await graduateGeneration(generationToGraduate);
            if (result.error) {
                toast({
                    title: 'エラー',
                    description: `卒業処理に失敗しました: ${result.error}`,
                    variant: 'destructive',
                });
            } else {
                toast({
                    title: '成功',
                    description: `${generationToGraduate}期の${result.count}人をOB/OGに更新しました。`,
                });
            }
            setIsGraduating(false);
            form.reset();
            setGenerationToGraduate(null);
        }

        setIsAlertOpen(false);
        setAlertAction(null);
    };

    const getAlertDescription = () => {
        if (alertAction === 'sync') {
            return '全メンバーのDiscordロールをデータベースの情報に基づいて更新します。この処理は完了まで数分かかる場合があります。本当に実行しますか？';
        }
        if (alertAction === 'graduate' && generationToGraduate) {
            return `${generationToGraduate}期に所属する全ての現役メンバーのステータスを「OB/OG」に変更します。この操作は元に戻せません。本当によろしいですか？`;
        }
        return '';
    };

    return (
        <div className="space-y-8">
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
                        メンバーのロールがDiscord上で正しく反映されていない場合や、期生ロールなどを一括で更新した後に実行してください。処理にはメンバーの数に応じて時間がかかります。
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
                            <CardTitle>期生をOB/OGに更新（卒業処理）</CardTitle>
                            <CardDescription>
                                指定した期数のメンバー全員を「OB/OG」ステータスに一括で変更します。
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        年度末の卒業処理などに使用します。この操作は元に戻せません。対象の期数を正確に入力してください。
                    </p>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleGraduateSubmit)} className="flex items-end gap-4">
                            <FormField
                                control={form.control}
                                name="generation"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>期数</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                placeholder="例: 50"
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
