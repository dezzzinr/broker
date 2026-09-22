import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="space-y-9" aria-busy="true" aria-label="Loading dashboard">
      <Skeleton className="h-14 rounded-2xl" />
      <div className="flex items-end justify-between">
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-44" />
        </div>
        <Skeleton className="hidden h-9 w-40 rounded-full sm:block" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[196px] rounded-2xl" />
        ))}
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-[380px] rounded-2xl" />
      </div>
    </div>
  );
}
