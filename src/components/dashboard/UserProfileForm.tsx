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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';

const profileSchema = z.object({
    generation: z.coerce.number().int().min(1, 'Generation must be a positive number.'),
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
                title: 'Error updating profile',
                description: result.error,
                variant: 'destructive',
            });
        } else {
            toast({
                title: 'Profile Updated',
                description: 'Your changes have been saved successfully.',
            });
        }
    }
    
    const statusMap = {
      0: "Middle School",
      1: "High School",
      2: "Alumni"
    };

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
                        <p className="text-muted-foreground">@{user.raw_user_meta_data.user_name}</p>
                        <p className="text-muted-foreground text-sm mt-2">Joined on {new Date(user.joined_at).toLocaleDateString()}</p>
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
                                    <FormLabel>Generation</FormLabel>
                                    <FormControl>
                                        <Input type="number" placeholder="e.g., 50" {...field} />
                                    </FormControl>
                                    <FormDescription>Your generation number in the club.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="student_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Student Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Your student ID" {...field} value={field.value ?? ''} />
                                    </FormControl>
                                    <FormDescription>Optional.</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Status</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={String(field.value)}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select your current status" />
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
                            {form.formState.isSubmitting ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </form>
                </Form>
            </div>
        </div>
    );
}
