import { Skeleton } from "@/components/ui/skeleton";

/** Shared skeleton for App Router `loading.tsx` boundaries. */
export function PageLoading({ title = "Loading…" }: { title?: string }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label={title}>
      <div className="space-y-2">
        <Skeleton className="h-9 w-64 max-w-full" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full sm:col-span-2" />
      </div>
    </div>
  );
}
