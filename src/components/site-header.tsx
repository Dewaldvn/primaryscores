import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { LinkButton } from "@/components/link-button";
import { GlobalSearchOpenButton } from "@/components/global-search";
import { SiteHeaderMobileNav } from "@/components/site-header-mobile-nav";
import type { ProfileRole } from "@/lib/auth";

export type HeaderProfile = {
  email: string;
  displayName: string;
  role: ProfileRole;
  avatarUrl: string | null;
} | null;

export function SiteHeader({ profile }: { profile: HeaderProfile }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-start justify-between gap-2 px-4 py-3 sm:items-center sm:gap-4 sm:py-4">
        <Link
          href="/"
          className="group flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5 pr-1 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-3 sm:pr-2 lg:max-w-none lg:flex-none lg:gap-4"
          aria-label="Primary Rugby Scores SA — home"
        >
          <span className="relative flex h-[4.8rem] w-auto shrink-0 items-center justify-center sm:h-[6.45rem] lg:h-[7.2rem]">
            <Image
              src="/brand/site-logo.png"
              alt=""
              width={421}
              height={592}
              className="h-full w-auto max-h-[4.8rem] object-contain object-center sm:max-h-[6.45rem] lg:max-h-[7.2rem]"
              priority
            />
          </span>
          <span className="min-w-0 text-lg font-semibold leading-snug tracking-tight text-blue-700 transition-colors group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300 sm:text-xl lg:text-[1.6875rem] xl:text-3xl">
            <span className="line-clamp-3 lg:line-clamp-none">Primary Rugby Scores SA</span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <nav className="hidden items-center gap-1 text-sm lg:flex">
            <Link
              href="/results"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Results
            </Link>
            <Link
              href="/seasons"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Seasons
            </Link>
            <Link
              href="/competitions"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Competitions
            </Link>
            <Link
              href="/submit"
              className="rounded-md px-2 py-1 font-medium text-primary hover:underline"
            >
              Submit
            </Link>
            {profile?.role === "ADMIN" ? (
              <Link
                href="/admin"
                className="rounded-md px-2 py-1 font-medium text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
              >
                Admin
              </Link>
            ) : null}
            <GlobalSearchOpenButton className="inline-flex" title="Search (⌘K)" />
          </nav>
          <SiteHeaderMobileNav profile={profile} />
          <GlobalSearchOpenButton className="inline-flex lg:hidden" title="Search" />
          {profile ? (
            <UserMenu
              email={profile.email}
              displayName={profile.displayName}
              role={profile.role}
              avatarUrl={profile.avatarUrl}
            />
          ) : (
            <>
              <LinkButton
                variant="ghost"
                size="sm"
                href="/login"
                className="hidden lg:inline-flex"
              >
                Sign in
              </LinkButton>
              <LinkButton size="sm" href="/signup">
                Join
              </LinkButton>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
