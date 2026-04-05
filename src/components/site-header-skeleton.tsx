import { Skeleton } from "@/components/ui/skeleton";

export function SiteHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Skeleton className="h-6 w-44 rounded" />
        <div className="hidden items-center gap-1 sm:flex">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-14" />
        </div>
        <Skeleton className="h-8 w-28" />
      </div>
    </header>
  );
}
