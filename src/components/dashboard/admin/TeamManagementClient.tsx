"use client";

import React, { useState } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
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
  name: z.string().min(1, '班の名前は必須です。'),
  discord_role_id: z.string().min(1, 'DiscordロールIDは必須です。'),
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
      toast({ title: 'エラー', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: '成功', description: `班が${editingTeam ? '更新' : '作成'}されました。` });
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
    if (confirm('本当にこの班を削除しますか？この操作は元に戻せません。')) {
        const result = await deleteTeam(teamId);
        if (result.error) {
            toast({ title: 'エラー', description: result.error, variant: 'destructive' });
        } else {
            toast({ title: '成功', description: '班を削除しました。' });
            setTeams(teams.filter(t => t.id !== teamId));
        }
    }
  };


  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          班を作成
        </Button>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {teams.map(team => (
          <AccordionItem key={team.id} value={team.id}>
             <div className="flex items-center justify-between w-full pr-4 border-b">
                <AccordionTrigger className='hover:no-underline flex-1 py-4'>
                    <div className="flex flex-col text-left">
                        <span className="font-semibold text-lg">{team.name}</span>
                        <span className="text-xs text-muted-foreground font-mono mt-1">{team.discord_role_id}</span>
                    </div>
                </AccordionTrigger>
                <div className='flex items-center gap-2 pl-4'>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenDialog(team); }}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(team.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
            </div>
            <AccordionContent>
              {/* Member and leader management UI would go here */}
              <p className="text-sm text-muted-foreground p-4 bg-muted rounded-md">メンバーと班長の割り当て機能は開発中です。</p>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTeam ? '班を編集' : '新しい班を作成'}</DialogTitle>
            <DialogDescription>
              班の詳細情報を入力してください。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>班の名前</FormLabel>
                    <FormControl>
                      <Input placeholder="例: フロントエンド班" {...field} />
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
                    <FormLabel>Discord ロールID</FormLabel>
                    <FormControl>
                      <Input placeholder="例: 123456789012345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsTeamDialogOpen(false)}>キャンセル</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? '保存中...' : '保存'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
