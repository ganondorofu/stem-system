import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between py-4 gap-4 flex-wrap">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-5 w-32" />
      </div>
      <div className="rounded-md border">
        <div className="p-4">
            <div className="space-y-3">
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-5 w-4/5" />
                <Skeleton className="h-5 w-3/5" />
            </div>
        </div>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
    </div>
  )
}
