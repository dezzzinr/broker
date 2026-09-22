import { Skeleton } from "@/components/ui/skeleton";

/** Generic page-loading skeleton with the common page-header rhythm. */
export function RouteSkeleton({ label = "Loading page", blocks = 2 }: { label?: string; blocks?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={label}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2.5">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <Skeleton className="h-9 w-36 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-2xl" />
        ))}
      </div>
      {Array.from({ length: blocks }).map((_, i) => (
        <Skeleton key={i} className="h-[280px] rounded-2xl" />
      ))}
    </div>
  );
}
