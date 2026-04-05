import { Skeleton } from "@/components/ui/skeleton";

export function SiteHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:py-4">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <Skeleton className="h-36 w-auto shrink-0 aspect-[421/592]" />
          <Skeleton className="h-10 w-48 rounded sm:h-12 sm:w-56 md:h-14 md:w-72" />
        </div>
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
