"use client"

import * as React from "react"
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type SortingState,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { MemberWithTeamsAndRelations, Team } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { MoreHorizontal, ArrowUpDown, User, GraduationCap, School, Building, Shield, Star } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { deleteMember, toggleAdminStatus, updateMemberTeams, getMemberDisplayName } from "@/lib/actions/members"
import { useToast } from "@/hooks/use-toast"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"

function ProfileDialog({ member }: { member: MemberWithTeamsAndRelations }) {
  const [displayName, setDisplayName] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (member) {
      setIsLoading(true);
      getMemberDisplayName(member.discord_uid)
        .then(name => {
          setDisplayName(name);
          setIsLoading(false);
        })
        .catch(() => {
          setDisplayName(member.raw_user_meta_data?.user_name?.split('#')[0] || '不明');
          setIsLoading(false);
        });
    }
  }, [member]);

  const statusMap: { [key: number]: { label: string, icon: React.ElementType } } = {
      0: { label: "中学生", icon: School },
      1: { label: "高校生", icon: School },
      2: { label: "OB/OG", icon: GraduationCap }
  };
  const { label: statusLabel, icon: StatusIcon } = statusMap[member.status] || { label: "不明", icon: User };
  const discordUsername = member.raw_user_meta_data?.user_name?.split('#')[0] || member.discord_uid || '不明';


  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle>メンバープロフィール</DialogTitle>
        <DialogDescription>
          {displayName || member.raw_user_meta_data?.name || 'メンバー'}の詳細情報です。
        </DialogDescription>
      </DialogHeader>
        <div className="grid md:grid-cols-3 gap-6 py-4">
            <div className="md:col-span-1 flex flex-col items-center text-center">
                <Avatar className="w-32 h-32 mb-4 border-4 border-primary/20 shadow-lg">
                    <AvatarImage src={member.avatar_url ?? undefined} alt={displayName ?? ''}/>
                    <AvatarFallback className="text-4xl"><User/></AvatarFallback>
                </Avatar>
                {isLoading ? (
                  <Skeleton className="h-8 w-40" />
                ) : (
                  <h2 className="text-2xl font-bold font-headline">{displayName}</h2>
                )}
                <p className="text-muted-foreground">@{discordUsername}</p>
                {member.is_admin && <Badge variant="destructive" className="mt-2"><Star className="w-3 h-3 mr-1"/>管理者</Badge>}
            </div>
            <div className="md:col-span-2 space-y-4">
                 <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">基本情報</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center gap-4">
                            <Building className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">期</p>
                                <p className="font-semibold">{member.generation}期生</p>
                            </div>
                        </div>
                        <Separator />
                        <div className="flex items-center gap-4">
                            <StatusIcon className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">ステータス</p>
                                <p className="font-semibold">{statusLabel}</p>
                            </div>
                        </div>
                        {member.student_number && (
                            <>
                                <Separator />
                                <div className="flex items-center gap-4">
                                    <School className="w-5 h-5 text-muted-foreground" />
                                    <div>
                                        <p className="text-sm text-muted-foreground">学籍番号</p>
                                        <p className="font-semibold">{member.student_number}</p>
                                    </div>
                                </div>
                            </>
                        )}
                         <Separator />
                         <div className="flex items-center gap-4">
                            <Shield className="w-5 h-5 text-muted-foreground" />
                            <div>
                                <p className="text-sm text-muted-foreground">所属班</p>
                                {member.teams && member.teams.length > 0 ? (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        {member.teams.map(team => (
                                            <Badge key={team.id} variant="secondary">{team.name}</Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="font-semibold">未所属</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl">連絡先</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm font-medium">{member.email}</p>
                        <p className="text-sm text-muted-foreground">Supabase登録メールアドレス</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    </DialogContent>
  )
}


export function MemberManagementClient({ initialMembers, allTeams }: { initialMembers: MemberWithTeamsAndRelations[], allTeams: Team[] }) {
  const [members, setMembers] = React.useState(initialMembers)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [isAlertOpen, setIsAlertOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<MemberWithTeamsAndRelations | null>(null)
  const [alertAction, setAlertAction] = React.useState<"delete" | "toggleAdmin">("delete")
  const { toast } = useToast()
  
  const [isTeamDialogOpen, setIsTeamDialogOpen] = React.useState(false)
  const teamForm = useForm<{ team_ids: string[] }>()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isTeamSubmitting, setIsTeamSubmitting] = React.useState(false);

  const statusMap = { 0: "中学生", 1: "高校生", 2: "OB/OG" }

  const handleAlertAction = async () => {
    if (!selectedMember) return;
    setIsSubmitting(true);
    let result;
    if (alertAction === "delete") {
      result = await deleteMember(selectedMember.supabase_auth_user_id)
      if (!result.error) {
        setMembers(members.filter(m => m.supabase_auth_user_id !== selectedMember.supabase_auth_user_id))
      }
    } else { // toggleAdmin
      result = await toggleAdminStatus(selectedMember.supabase_auth_user_id, selectedMember.is_admin)
      if (!result.error) {
        setMembers(members.map(m => m.supabase_auth_user_id === selectedMember.supabase_auth_user_id ? {...m, is_admin: !m.is_admin} : m))
      }
    }

    toast({
      title: result.error ? "エラー" : "成功",
      description: result.error || "操作が正常に完了しました。",
      variant: result.error ? "destructive" : "default",
    })
    
    setIsSubmitting(false)
    setIsAlertOpen(false)
    setSelectedMember(null)
  }
  
  const handleTeamDialog = (member: MemberWithTeamsAndRelations) => {
    setSelectedMember(member)
    teamForm.reset({ team_ids: member.teams.map(t => t.id) })
    setIsTeamDialogOpen(true)
  }

  const handleTeamUpdate = async (values: {team_ids: string[]}) => {
    if (!selectedMember) return;
    setIsTeamSubmitting(true);

    const result = await updateMemberTeams(selectedMember.supabase_auth_user_id, values.team_ids);
    if (result.error) {
      toast({ title: 'エラー', description: result.error, variant: 'destructive' });
    } else {
      toast({ title: '成功', description: '所属班を更新しました。' });
      // Update local state
      setMembers(members.map(m => {
        if (m.supabase_auth_user_id === selectedMember.supabase_auth_user_id) {
          return {
            ...m,
            teams: allTeams.filter(t => values.team_ids.includes(t.id))
          }
        }
        return m;
      }));
      setIsTeamDialogOpen(false);
    }
    setIsTeamSubmitting(false);
  }

  const columns: ColumnDef<MemberWithTeamsAndRelations>[] = [
     {
      accessorKey: "discord_uid",
      header: "メンバー",
      cell: ({ row }) => {
        const member = row.original;
        const discordUsername = member.raw_user_meta_data?.user_name?.split('#')[0] || member.discord_uid;
        return (
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarImage src={member.avatar_url || ''} />
              <AvatarFallback><User className="w-4 h-4" /></AvatarFallback>
            </Avatar>
            <span className="font-medium">{discordUsername}</span>
          </div>
        )
      },
    },
    {
      accessorKey: "generation",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          期
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "status",
      header: "ステータス",
      cell: ({ row }) => statusMap[row.original.status as keyof typeof statusMap] || "不明",
    },
    {
      accessorKey: "is_admin",
      header: "権限",
      cell: ({ row }) => row.original.is_admin ? <Badge variant="destructive">管理者</Badge> : <Badge variant="secondary">メンバー</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const member = row.original
        return (
          <Dialog>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0" disabled={isSubmitting}>
                  <span className="sr-only">メニューを開く</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>操作</DropdownMenuLabel>
                <DialogTrigger asChild>
                   <DropdownMenuItem>プロフィールを表示</DropdownMenuItem>
                </DialogTrigger>
                 <DropdownMenuItem onClick={() => handleTeamDialog(member)}>
                  班を編集
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => {
                  setSelectedMember(member)
                  setAlertAction("toggleAdmin")
                  setIsAlertOpen(true)
                }}>
                  {member.is_admin ? "管理者権限を取り消す" : "管理者に設定"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => {
                  setSelectedMember(member)
                  setAlertAction("delete")
                  setIsAlertOpen(true)
                }}>
                  メンバーを削除
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <ProfileDialog member={member} />
          </Dialog>
        )
      },
    },
  ]

  const table = useReactTable({
    data: members,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
    },
  })

  return (
    <div>
      <div className="flex items-center py-4">
        <Input
          placeholder="Discord IDで絞り込み..."
          value={(table.getColumn("discord_uid")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("discord_uid")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  結果がありません。
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          前へ
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          次へ
        </Button>
      </div>
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当によろしいですか？</AlertDialogTitle>
            <AlertDialogDescription>
              {alertAction === 'delete'
                ? `これによりメンバーがソフトデリートされます。メンバーは「削除済み」としてマークされ、アクセスできなくなります。この操作はデータベース内で元に戻すことができます。`
                : `これにより、このユーザーの管理者権限が${selectedMember?.is_admin ? '取り消され' : '付与され'}ます。`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsAlertOpen(false)} disabled={isSubmitting}>キャンセル</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAlertAction} 
              disabled={isSubmitting}
              className={alertAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              {isSubmitting ? '処理中...' : '続行'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={isTeamDialogOpen} onOpenChange={setIsTeamDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>所属班の編集</DialogTitle>
            <DialogDescription>{selectedMember?.raw_user_meta_data.name}さんの所属する班を選択してください。</DialogDescription>
          </DialogHeader>
          <Form {...teamForm}>
            <form onSubmit={teamForm.handleSubmit(handleTeamUpdate)}>
              <FormField
                control={teamForm.control}
                name="team_ids"
                render={() => (
                  <FormItem className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      {allTeams.map(team => (
                        <FormField
                          key={team.id}
                          control={teamForm.control}
                          name="team_ids"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4 hover:bg-accent hover:text-accent-foreground transition-colors">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(team.id)}
                                  onCheckedChange={checked => {
                                    return checked
                                      ? field.onChange([...(field.value || []), team.id])
                                      : field.onChange(field.value?.filter(id => id !== team.id))
                                  }}
                                  id={`team-${team.id}`}
                                />
                              </FormControl>
                              <FormLabel className="font-normal w-full cursor-pointer" htmlFor={`team-${team.id}`}>
                                {team.name}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsTeamDialogOpen(false)} disabled={isTeamSubmitting}>キャンセル</Button>
                <Button type="submit" disabled={isTeamSubmitting}>
                  {isTeamSubmitting ? '保存中...' : '保存'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
