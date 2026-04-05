import Link from "next/link";
import { UserMenu } from "@/components/user-menu";
import { LinkButton } from "@/components/link-button";
import type { ProfileRole } from "@/lib/auth";

type HeaderProfile = {
  email: string;
  displayName: string;
  role: ProfileRole;
} | null;

export function SiteHeader({ profile }: { profile: HeaderProfile }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="font-semibold tracking-tight text-primary">
          Primary Rugby Scores SA
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
        </nav>
        <div className="flex items-center gap-2">
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
