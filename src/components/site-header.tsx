import Image from "next/image";
import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { LinkButton } from "@/components/link-button";
import { GlobalSearchOpenButton } from "@/components/global-search";
import { SiteHeaderMobileNav } from "@/components/site-header-mobile-nav";
import { SiteHeaderNavSportDropdown } from "@/components/site-header-nav-sport-dropdown";
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
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3 sm:gap-4 sm:py-4">
        <Link
          href="/"
          className="group flex shrink-0 items-center rounded-md py-0.5 pr-1 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:pr-2"
          aria-label="Schools Scores SA — home"
        >
          <span className="relative flex h-[4.8rem] w-auto shrink-0 items-center justify-center sm:h-[6.45rem] lg:h-[7.2rem]">
            <Image
              src="/brand/site-logo.png"
              alt=""
              width={753}
              height={790}
              className="h-full w-auto max-h-[4.8rem] object-contain object-center sm:max-h-[6.45rem] lg:max-h-[7.2rem]"
              priority
            />
          </span>
        </Link>
        <nav
          className="hidden min-w-0 flex-1 items-center justify-center gap-x-0.5 text-sm lg:flex"
          aria-label="Main"
        >
          <SiteHeaderNavSportDropdown
            label="Live Scores"
            basePath="/live"
            variant="muted"
            ariaLabel="Live scores by sport"
          />
          <span className="select-none px-1 text-muted-foreground/60" aria-hidden="true">
            |
          </span>
          <SiteHeaderNavSportDropdown
            label="Results"
            basePath="/results"
            variant="muted"
            ariaLabel="Results by sport"
          />
          <span className="select-none px-1 text-muted-foreground/60" aria-hidden="true">
            |
          </span>
          <SiteHeaderNavSportDropdown
            label="Submit"
            basePath="/submit"
            variant="primary"
            ariaLabel="Submit a score by sport"
          />
          <span className="select-none px-1 text-muted-foreground/60" aria-hidden="true">
            |
          </span>
          <Link
            href="/find-school"
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Schools
          </Link>
          <span className="select-none px-1 text-muted-foreground/60" aria-hidden="true">
            |
          </span>
          <Link
            href="/feedback"
            className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Feedback
          </Link>
        </nav>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Link
            href="/about"
            className="hidden rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground lg:inline-flex"
          >
            About
          </Link>
          <span
            className="hidden select-none px-1 text-muted-foreground/60 lg:inline"
            aria-hidden="true"
          >
            |
          </span>
          <GlobalSearchOpenButton className="hidden lg:inline-flex" title="Search (⌘K)" />
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
