"use client";

import React, { useState } from 'react';
import type { GenerationRole } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { updateGenerationRoles } from '@/lib/actions/generations';

const generationSchema = z.object({
  roles: z.array(z.object({
    generation: z.coerce.number().int().min(0, "Gen must be non-negative"),
    discord_role_id: z.string().min(1, "Role ID is required"),
  })),
});

type GenerationFormData = z.infer<typeof generationSchema>;

export function GenerationManagementClient({ initialRoles }: { initialRoles: GenerationRole[] }) {
  const { toast } = useToast();
  const form = useForm<GenerationFormData>({
    resolver: zodResolver(generationSchema),
    defaultValues: {
      roles: initialRoles,
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "roles",
  });

  const onSubmit = async (data: GenerationFormData) => {
    const result = await updateGenerationRoles(data.roles);
    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Generation roles have been updated.' });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[150px]">Generation</TableHead>
                <TableHead>Discord Role ID</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fields.map((field, index) => (
                <TableRow key={field.id}>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`roles.${index}.generation`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="number" placeholder="e.g., 50" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <FormField
                      control={form.control}
                      name={`roles.${index}.discord_role_id`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="e.g., 123456789012345678" {...field} />
                          </FormControl>
                           <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TableCell>
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
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
            >
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Row
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Saving...' : 'Save All Changes'}
            </Button>
        </div>
      </form>
    </Form>
  );
}
