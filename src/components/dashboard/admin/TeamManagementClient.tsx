"use client";

import React, { useState, useMemo } from 'react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { PlusCircle, Trash2, Edit, Crown } from 'lucide-react';
import type { Team, Member, MemberTeamRelation, TeamLeader, EnrichedMember } from '@/lib/types';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createTeam, deleteTeam, updateTeam, updateTeamLeader } from '@/lib/actions/teams';
import { Badge } from '@/components/ui/badge';
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
import { Combobox } from '@/components/ui/combobox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';


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
  members: EnrichedMember[],
  relations: MemberTeamRelation[],
  leaders: TeamLeader[],
}) {
  const [teams, setTeams] = useState(initialTeams);
  const [leaders, setLeaders] = useState(initialLeaders);
  const [isTeamDialogOpen, setIsTeamDialogOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const { toast } = useToast();
  const [teamToDelete, setTeamToDelete] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TeamFormData>({
    resolver: zodResolver(teamSchema),
  });

  const getTeamMembers = (teamId: string) => {
    const memberIds = initialRelations.filter(r => r.team_id === teamId).map(r => r.member_id);
    return allMembers.filter(m => memberIds.includes(m.supabase_auth_user_id));
  };
  
  const getLeader = (teamId: string) => {
      const leaderRelation = leaders.find(l => l.team_id === teamId);
      if (!leaderRelation) return null;
      return allMembers.find(m => m.supabase_auth_user_id === leaderRelation.member_id) || null;
  }

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
  
  const confirmDelete = (teamId: string) => {
    setTeamToDelete(teamId);
  }

  const handleDelete = async () => {
    if (!teamToDelete) return;
    
    setIsSubmitting(true);
    const result = await deleteTeam(teamToDelete);
    if (result.error) {
        toast({ title: 'エラー', description: result.error, variant: 'destructive' });
    } else {
        toast({ title: '成功', description: '班を削除しました。' });
        setTeams(teams.filter(t => t.id !== teamToDelete));
    }
    setIsSubmitting(false);
    setTeamToDelete(null);
  };
  
  const handleLeaderChange = async (teamId: string, memberId: string | null) => {
      setIsSubmitting(true);
      const result = await updateTeamLeader(teamId, memberId);
      if (result.error) {
          toast({ title: 'エラー', description: result.error, variant: 'destructive' });
      } else {
          toast({ title: '成功', description: '班長を更新しました。' });
          if (memberId) {
              setLeaders([...leaders.filter(l => l.team_id !== teamId), { team_id: teamId, member_id: memberId }]);
          } else {
              setLeaders(leaders.filter(l => l.team_id !== teamId));
          }
      }
      setIsSubmitting(false);
  }


  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleOpenDialog(null)}>
          <PlusCircle className="mr-2 h-4 w-4" />
          班を作成
        </Button>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {teams.map(team => {
          const teamMembers = getTeamMembers(team.id);
          const leader = getLeader(team.id);
          const memberOptions = teamMembers.map(m => ({
            value: m.supabase_auth_user_id,
            label: m.displayName || m.discord_uid,
            id: m.discord_uid,
            avatar: m.avatar_url
          }));

          return (
            <AccordionItem key={team.id} value={team.id}>
              <div className="flex items-center justify-between w-full border-b">
                 <AccordionTrigger className='hover:no-underline flex-1 py-4 data-[state=open]:border-b'>
                    <div className="flex flex-col text-left">
                        <span className="font-semibold text-lg">{team.name}</span>
                        <span className="text-xs text-muted-foreground font-mono mt-1">{team.discord_role_id}</span>
                    </div>
                </AccordionTrigger>
                <div className='flex items-center gap-2 pl-4 pr-4 border-b'>
                    <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleOpenDialog(team); }}><Edit className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={(e) => { e.stopPropagation(); confirmDelete(team.id); }}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
              <AccordionContent className="bg-muted/50">
                <div className="p-4 space-y-4">
                  <h4 className="font-semibold">班長</h4>
                  {leader && <Badge><Crown className="w-3 h-3 mr-1" />{leader.displayName}</Badge>}
                   <Combobox
                        options={memberOptions}
                        value={leader?.supabase_auth_user_id || ''}
                        onSelect={(value) => handleLeaderChange(team.id, value === 'none' ? null : value)}
                        placeholder="班長を検索 (ID or 名前)..."
                        triggerClass="max-w-xs"
                        disabled={isSubmitting}
                    />
                  <p className="text-sm text-muted-foreground">この班に所属しているメンバーの中から班長を選択できます。</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
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
                <Button type="button" variant="outline" onClick={() => setIsTeamDialogOpen(false)} disabled={form.formState.isSubmitting}>キャンセル</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? '保存中...' : '保存'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!teamToDelete} onOpenChange={(open) => !open && setTeamToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当にこの班を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              この操作は元に戻せません。関連するメンバーの割り当ても解除されます。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTeamToDelete(null)} disabled={isSubmitting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isSubmitting} className="bg-destructive hover:bg-destructive/90">
              {isSubmitting ? '削除中...' : '削除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
