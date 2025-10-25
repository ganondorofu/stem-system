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
import type { Member, Team } from "@/lib/types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal, ArrowUpDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { deleteMember, toggleAdminStatus } from "@/lib/actions/members"
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

// This type is temporary until we fetch the full profiles
type MemberWithName = Member & { name: string };

export function MemberManagementClient({ initialMembers, allTeams }: { initialMembers: MemberWithName[], allTeams: Team[] }) {
  const [members, setMembers] = React.useState(initialMembers)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [isAlertOpen, setIsAlertOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<MemberWithName | null>(null)
  const [alertAction, setAlertAction] = React.useState<"delete" | "toggleAdmin">("delete")
  const { toast } = useToast()

  const statusMap = { 0: "中学生", 1: "高校生", 2: "OB/OG" }

  const handleAction = async () => {
    if (!selectedMember) return
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
    
    setIsAlertOpen(false)
    setSelectedMember(null)
  }

  const columns: ColumnDef<MemberWithName>[] = [
     {
      accessorKey: "name",
      header: "氏名",
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
      accessorKey: "student_number",
      header: "学籍番号",
    },
    {
      accessorKey: "discord_uid",
      header: "Discord UID",
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">メニューを開く</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>操作</DropdownMenuLabel>
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
          placeholder="氏名 or Discord UIDで絞り込み..."
          value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("name")?.setFilterValue(event.target.value)
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
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} className={alertAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}>
              続行
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
