import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { LinkButton } from "@/components/link-button";
import { GlobalSearchOpenButton } from "@/components/global-search";
import type { ProfileRole } from "@/lib/auth";

type HeaderProfile = {
  email: string;
  displayName: string;
  role: ProfileRole;
} | null;

export function SiteHeader({ profile }: { profile: HeaderProfile }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:py-4">
        <Link
          href="/"
          className="group flex min-w-0 max-w-full items-center gap-3 rounded-md py-0.5 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:gap-4"
          aria-label="Primary Rugby Scores SA — home"
        >
          <span className="relative flex h-36 shrink-0 items-center justify-center">
            <Image
              src="/brand/site-logo.png"
              alt=""
              width={421}
              height={592}
              className="h-full w-auto max-h-36 object-contain object-center"
              priority
            />
          </span>
          <span className="min-w-0 max-w-[min(100%,16rem)] text-2xl font-semibold leading-snug tracking-tight text-blue-700 transition-colors group-hover:text-blue-800 dark:text-blue-400 dark:group-hover:text-blue-300 sm:max-w-xs sm:text-[1.6875rem] md:max-w-none md:text-3xl">
            Primary Rugby Scores SA
          </span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm sm:flex">
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
          {profile?.role === "MODERATOR" || profile?.role === "ADMIN" ? (
            <Link
              href="/moderator"
              className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Moderation
            </Link>
          ) : null}
          {profile?.role === "ADMIN" ? (
            <Link
              href="/admin"
              className="rounded-md px-2 py-1 font-medium text-amber-700 hover:bg-amber-500/15 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-300"
            >
              Admin
            </Link>
          ) : null}
          <GlobalSearchOpenButton
            className="hidden sm:inline-flex"
            title="Search (⌘K)"
          />
        </nav>
        <div className="flex items-center gap-2">
          <GlobalSearchOpenButton className="inline-flex sm:hidden" />
          {profile ? (
            <UserMenu
              email={profile.email}
              displayName={profile.displayName}
              role={profile.role}
            />
          ) : (
            <>
              <LinkButton
                variant="ghost"
                size="sm"
                href="/login"
                className="hidden sm:inline-flex"
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
