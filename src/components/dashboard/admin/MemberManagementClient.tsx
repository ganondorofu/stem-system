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
import type { FullUserProfile, Team } from "@/lib/types"
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

type MemberData = Omit<FullUserProfile, "raw_user_meta_data">

export function MemberManagementClient({ initialMembers, allTeams }: { initialMembers: MemberData[], allTeams: Team[] }) {
  const [members, setMembers] = React.useState(initialMembers)
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [isAlertOpen, setIsAlertOpen] = React.useState(false)
  const [selectedMember, setSelectedMember] = React.useState<MemberData | null>(null)
  const [alertAction, setAlertAction] = React.useState<"delete" | "toggleAdmin">("delete")
  const { toast } = useToast()

  const statusMap = { 0: "Middle", 1: "High", 2: "Alumni" }

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
      title: result.error ? "Error" : "Success",
      description: result.error || "Action completed successfully.",
      variant: result.error ? "destructive" : "default",
    })
    
    setIsAlertOpen(false)
    setSelectedMember(null)
  }

  const columns: ColumnDef<MemberData>[] = [
    {
      accessorKey: "generation",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Gen
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: "student_number",
      header: "Student No.",
    },
    {
      accessorKey: "discord_uid",
      header: "Discord UID",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => statusMap[row.original.status as keyof typeof statusMap] || "Unknown",
    },
    {
      accessorKey: "is_admin",
      header: "Role",
      cell: ({ row }) => row.original.is_admin ? <Badge variant="destructive">Admin</Badge> : <Badge variant="secondary">Member</Badge>,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const member = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => {
                setSelectedMember(member)
                setAlertAction("toggleAdmin")
                setIsAlertOpen(true)
              }}>
                {member.is_admin ? "Revoke Admin" : "Make Admin"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => {
                setSelectedMember(member)
                setAlertAction("delete")
                setIsAlertOpen(true)
              }}>
                Delete Member
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
          placeholder="Filter by Discord UID..."
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
                  No results.
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
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
       <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {alertAction === 'delete'
                ? `This will soft-delete the member. They will be marked as 'deleted' and lose access. This action can be reversed in the database.`
                : `This will ${selectedMember?.is_admin ? 'revoke' : 'grant'} admin privileges for this user.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAction} className={alertAction === 'delete' ? 'bg-destructive hover:bg-destructive/90' : ''}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
