import { Skeleton } from "@/components/ui/skeleton";

export function SiteHeaderSkeleton() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-2 px-4 py-3 sm:items-center sm:gap-4 sm:py-4">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3 lg:flex-none">
          <Skeleton className="h-[4.8rem] w-auto shrink-0 aspect-[421/592] sm:h-[6.45rem] lg:h-[7.2rem]" />
          <Skeleton className="h-8 w-36 rounded sm:h-9 sm:w-44 lg:h-12 lg:w-56" />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <div className="hidden items-center gap-1 lg:flex">
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-14" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <Skeleton className="h-9 w-9 shrink-0 rounded-md lg:hidden" />
          <Skeleton className="h-8 w-8 rounded-md lg:hidden" />
          <Skeleton className="h-8 w-28" />
        </div>
      </div>
    </header>
  );
}
