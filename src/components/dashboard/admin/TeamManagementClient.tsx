"use client";

import React, { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2, Edit } from 'lucide-react';
import type { Team, Member, MemberTeamRelation, TeamLeader } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createTeam, deleteTeam, updateTeam } from '@/lib/actions/teams';

const teamSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Team name is required.'),
  discord_role_id: z.string().min(1, 'Discord Role ID is required.'),
});

type TeamFormData = z.infer<typeof teamSchema>;

export function TeamManagementClient({
  teams: initialTeams,
  members: allMembers,
  relations: initialRelations,
  leaders: initialLeaders,
}: {
  teams: Team[],
  members: Pick<Member, 'supabase_auth_user_id' | 'generation' | 'student_number' | 'discord_uid'>[],
  relations: MemberTeamRelation[],
  leaders: TeamLeader[],
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const { toast } = useToast();

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
  });

  const handleOpenDialog = (team: Team | null) => {
    setEditingTeam(team);
    form.reset(team ? { ...team } : { name: '', discord_role_id: '' });
    setIsTeamDialogOpen(true);
  };

  const onSubmit = async (data: TeamFormData) => {
    const action = editingTeam ? updateTeam : createTeam;
    const result = await action(data);

    if (result.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Team ${editingTeam ? 'updated' : 'created'} successfully.` });
      if (result.team) {
        if (editingTeam) {
          setTeams(teams.map(t => t.id === result.team!.id ? result.team! : t));
        } else {
          setTeams([...teams, result.team]);
        }
      }
      setIsTeamDialogOpen(false);
    }
  };

  const handleDelete = async (teamId: string) => {
    if (confirm('Are you sure you want to delete this team? This cannot be undone.')) {
        const result = await deleteTeam(teamId);
        if (result.error) {
            toast({ title: 'Error', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: 'Success', description: 'Team deleted.' });
            setTeams(teams.filter(t => t.id !== teamId));
        }
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Create Team
        </Button>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {teams.map(team => (
          <AccordionItem key={team.id} value={team.id}>
            <AccordionTrigger className='hover:no-underline'>
                <div className="flex items-center justify-between w-full pr-4">
                    <span className="font-semibold text-lg">{team.name}</span>
                    <div className='flex items-center gap-2'>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenDialog(team); }}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(team.id); }}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                </div>
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-muted-foreground mb-4">Discord Role ID: {team.discord_role_id}</p>
              {/* Member and leader management UI would go here */}
              <p className="text-sm text-muted-foreground p-4 bg-muted rounded-md">Member and leader assignment functionality is under development.</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? 'Edit Team' : 'Create New Team'}</DialogTitle>
            <DialogDescription>
              Fill in the details for the team.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Frontend Team" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="discord_role_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discord Role ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., 123456789012345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsTeamDialogOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? 'Saving...' : 'Save'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
