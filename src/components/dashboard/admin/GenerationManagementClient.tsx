
"use client";

import React, { useState } from 'react';
import type { GenerationRole } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Wand2 } from 'lucide-react';
import { useForm, useFieldArray, useForm as useGenerationForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage, FormLabel } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { updateGenerationRoles, createGenerationRole } from '@/lib/actions/generations';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

const generationSchema = z.object({
  roles: z.array(z.object({
    generation: z.coerce.number().int().min(0, "期は0以上である必要があります"),
    discord_role_id: z.string().min(1, "ロールIDは必須です"),
  })),
});

const createSchema = z.object({
    generation: z.coerce.number().int().gt(0, "期は正の整数である必要があります"),
});

type GenerationFormData = z.infer<typeof generationSchema>;
type CreateFormData = z.infer<typeof createSchema>;

export function GenerationManagementClient({ initialRoles }: { initialRoles: GenerationRole[] }) {
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);

  const tableForm = useForm<GenerationFormData>({
    resolver: zodResolver(generationSchema),
    defaultValues: {
      roles: initialRoles.sort((a, b) => b.generation - a.generation),
    },
  });

  const { fields, append, remove, replace } = useFieldArray({
    control: tableForm.control,
    name: "roles",
  });

  const createForm = useGenerationForm<CreateFormData>({
    resolver: zodResolver(createSchema),
  });

  const handleCreate = async (data: CreateFormData) => {
    setIsCreating(true);
    const result = await createGenerationRole(data.generation);
    if (result.error) {
      toast({ title: 'エラー', description: result.error, variant: 'destructive' });
    } else if (result.newRole) {
      toast({ title: '成功', description: `${data.generation}期生のロールが作成されました。` });
      // Add the new role to the top of the list and re-sort
      const newRoles = [result.newRole, ...fields].sort((a, b) => b.generation - a.generation);
      replace(newRoles);
      createForm.reset({ generation: undefined });
    }
    setIsCreating(false);
  };
  
  const onTableSubmit = async (data: GenerationFormData) => {
    const result = await updateGenerationRoles(data.roles);
    if (result.error) {
      toast({ title: 'エラー', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: '成功', description: '期別ロールが更新されました。' });
      // Re-sort after saving
      const sortedRoles = [...data.roles].sort((a, b) => b.generation - a.generation);
      replace(sortedRoles);
    }
  };

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>期生ロール自動作成</CardTitle>
                <CardDescription>
                    新しい期数を入力してボタンを押すと、Discordにロールが自動で作成され、下のリストに追加されます。
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...createForm}>
                    <form onSubmit={createForm.handleSubmit(handleCreate)} className="flex items-start gap-4">
                        <FormField
                        control={createForm.control}
                        name="generation"
                        render={({ field }) => (
                            <FormItem className="flex-1">
                                <FormLabel>新しい期生</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="例: 53" {...field} onChange={e => field.onChange(e.target.valueAsNumber)} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                        />
                        <div className="pt-8">
                            <Button type="submit" disabled={isCreating}>
                                <Wand2 className="mr-2 h-4 w-4" />
                                {isCreating ? '作成中...' : '自動作成'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
        
        <Separator />

        <Form {...tableForm}>
        <form onSubmit={tableForm.handleSubmit(onTableSubmit)} className="space-y-6">
            <div className="rounded-md border">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead className="w-[150px]">期</TableHead>
                    <TableHead>Discord ロールID</TableHead>
                    <TableHead className="w-[50px] text-right">操作</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {fields.map((field, index) => (
                    <TableRow key={field.id}>
                    <TableCell>
                        <FormField
                        control={tableForm.control}
                        name={`roles.${index}.generation`}
                        render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <Input type="number" placeholder="例: 50" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </TableCell>
                    <TableCell>
                        <FormField
                        control={tableForm.control}
                        name={`roles.${index}.discord_role_id`}
                        render={({ field }) => (
                            <FormItem>
                            <FormControl>
                                <Input placeholder="例: 123456789012345678" {...field} />
                            </FormControl>
                            <FormMessage />
                            </FormItem>
                        )}
                        />
                    </TableCell>
                    <TableCell className="text-right">
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={tableForm.formState.isSubmitting}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
            </div>

            <div className="flex justify-between items-center">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => append({ generation: 0, discord_role_id: '' })}
                    disabled={tableForm.formState.isSubmitting}
                >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    手動で追加
                </Button>
                <Button type="submit" disabled={tableForm.formState.isSubmitting}>
                    {tableForm.formState.isSubmitting ? '保存中...' : 'すべての変更を保存'}
                </Button>
            </div>
        </form>
        </Form>
    </div>
  );
}
