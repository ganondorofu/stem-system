"use client";

import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useRouter } from 'next/navigation';
import { resyncDiscordMember } from '@/lib/actions/members';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

const reSyncSchema = z.object({
    last_name: z.string().min(1, '姓は必須です。'),
    first_name: z.string().min(1, '名は必須です。'),
});

export function ReSyncForm() {
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const router = useRouter();

    const form = useForm<z.infer<typeof reSyncSchema>>({
        resolver: zodResolver(reSyncSchema),
        defaultValues: {
            last_name: '',
            first_name: '',
        },
    });

    async function onSubmit(values: z.infer<typeof reSyncSchema>) {
        setIsSubmitting(true);
        setError(null);
        
        const result = await resyncDiscordMember(values);
        
        if (result.error) {
            setError(result.error);
            setIsSubmitting(false);
        } else {
            router.refresh();
        }
    }

    return (
        <div className="space-y-4">
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="last_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>姓</FormLabel>
                                    <FormControl>
                                        <Input placeholder="例: 山田" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="first_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>名</FormLabel>
                                    <FormControl>
                                        <Input placeholder="例: 太郎" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <FormDescription>
                        Discordのニックネームとロールを再設定します。全角で入力してください。
                    </FormDescription>
                    
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                連携中...
                            </>
                        ) : (
                            'Discord連携を再設定'
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    );
}
