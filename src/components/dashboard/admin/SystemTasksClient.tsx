"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { syncAllDiscordRoles, updateStatusesForNewAcademicYear, renameGraduatesToNewFormat } from '@/lib/actions/members';
import { Loader2, UserCog, RefreshCw, GraduationCap } from 'lucide-react';
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

const newYearSchema = z.object({
    highSchoolFirstYearGeneration: z.coerce.number().int().positive('期数は正の整数である必要があります。'),
});

export function SystemTasksClient() {
    const { toast } = useToast();
    const [isSyncing, setIsSyncing] = useState(false);
    const [isUpdatingYear, setIsUpdatingYear] = useState(false);
    const [isRenamingGraduates, setIsRenamingGraduates] = useState(false);

    const [isAlertOpen, setIsAlertOpen] = useState(false);
    const [alertAction, setAlertAction] = useState<'sync' | 'newYear' | 'renameGraduates' | null>(null);
    
    const newYearForm = useForm<z.infer<typeof newYearSchema>>({
        resolver: zodResolver(newYearSchema),
    });

    const handleSyncClick = () => {
        setAlertAction('sync');
        setIsAlertOpen(true);
    };

    const handleNewYearSubmit = (values: z.infer<typeof newYearSchema>) => {
        newYearForm.setValue('highSchoolFirstYearGeneration', values.highSchoolFirstYearGeneration);
        setAlertAction('newYear');
        setIsAlertOpen(true);
    };

    const handleRenameGraduatesClick = () => {
        setAlertAction('renameGraduates');
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

        if (alertAction === 'renameGraduates') {
            setIsRenamingGraduates(true);
            const result = await renameGraduatesToNewFormat();
            toast({
                title: result.error ? 'エラー' : '成功',
                description: result.error ? `ニックネーム変更に失敗しました: ${result.error}` : result.message,
                variant: result.error ? 'destructive' : 'default',
            });
            setIsRenamingGraduates(false);
        }

        setIsAlertOpen(false);
        setAlertAction(null);
    };

    const getAlertDescription = () => {
        if (alertAction === 'sync') {
            return '全メンバーのDiscordロールをデータベースの情報に基づいて更新します。この処理は完了まで数分かかる場合があります。本当に実行しますか？';
        }
        if (alertAction === 'newYear') {
            const generation = newYearForm.getValues('highSchoolFirstYearGeneration');
            return `現在の高校1年生を「${generation}期」として、全メンバーのステータス（中学生, 高校生, OB/OG）を一括更新します。この操作は元に戻せません。本当によろしいですか？`;
        }
        if (alertAction === 'renameGraduates') {
            return 'OB/OGステータスの全メンバーのDiscordニックネームを「名前(第n期卒業生)」形式に更新します。在籍中メンバーには影響しません。本当に実行しますか？';
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

            <Card className="border-orange-500/50">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <GraduationCap className="h-8 w-8 text-orange-500" />
                        <div>
                            <CardTitle>卒業生ニックネーム変更</CardTitle>
                            <CardDescription>
                                OB/OGステータスの全メンバーのDiscordニックネームを「名前(第n期卒業生)」形式に更新します。
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                        年度更新とは独立して実行できます。在籍中のメンバーには影響しません。ニックネームを元の形式に戻すには手動対応が必要になるため、慎重に実行してください。
                    </p>
                    <Button onClick={handleRenameGraduatesClick} disabled={isRenamingGraduates} variant="outline">
                        {isRenamingGraduates ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                変更中...
                            </>
                        ) : (
                            '卒業生ニックネームを更新'
                        )}
                    </Button>
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
                        >
                            実行
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
