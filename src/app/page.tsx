import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { listRecentVerifiedResultsPaged } from "@/lib/data/results";
import {
  listScheduledLiveSessions,
  listUnderwayLiveSessions,
  type LiveSessionPublic,
} from "@/lib/data/live-sessions";
import { listFavouriteTeamsForProfile, type FavouriteTeamRow } from "@/lib/data/favourite-teams";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { HomeHeroSection } from "@/components/home-hero-section";
import { HomeSportPickTiles } from "@/components/home-sport-pick-tiles";
import { HomeLiveScoresPeek } from "@/components/home-live-scores-peek";
import { HomeUpcomingScheduledLoadMore } from "@/components/home-upcoming-scheduled-load-more";
import { HomeFavouriteTeamsPeek } from "@/components/home-favourite-teams";
import { HomeRecentVerifiedLoadMore } from "@/components/home-recent-verified-load-more";
import { withTimeout } from "@/lib/with-timeout";
import { PUBLIC_DB_QUERY_MS } from "@/lib/public-db-timeout";
import { getHomePageStats, type HomePageStats } from "@/lib/data/home-stats";
import type { LiveSessionClientRow } from "@/lib/live-session-types";

function isStatementTimeoutMessage(msg: string): boolean {
  return /statement timeout|57014|canceling statement/i.test(msg);
}

type Settled<T> =
  | { status: "fulfilled"; value: T }
  | { status: "rejected"; reason: unknown };

async function settleWithTimeout<T>(promise: Promise<T>, ms: number): Promise<Settled<T>> {
  try {
    const value = await withTimeout(promise, ms);
    return { status: "fulfilled", value };
  } catch (reason) {
    return { status: "rejected", reason };
  }
}

export default async function HomePage() {
  let recent: Awaited<ReturnType<typeof listRecentVerifiedResultsPaged>> = [];
  let livePeek: LiveSessionPublic[] = [];
  let databaseLoadError: string | null = null;
  let recentLoadError: string | null = null;
  let livePeekError: string | null = null;
  let favouriteTeams: FavouriteTeamRow[] = [];
  let homeStats: HomePageStats | null = null;
  let upcomingScheduled: LiveSessionClientRow[] = [];

  if (isDatabaseConfigured()) {
    try {
      const sessionUser = await getSessionUser();
      /** Favourite teams are loaded separately so an extra query when signed in cannot push the
       *  batched home queries over {@link PUBLIC_DB_QUERY_MS} and trigger a false “database” error. */
      const [rr, rl, hs, up] = await Promise.all([
        settleWithTimeout(listRecentVerifiedResultsPaged(0, 8), PUBLIC_DB_QUERY_MS),
        settleWithTimeout(listUnderwayLiveSessions({ limit: 5 }), PUBLIC_DB_QUERY_MS),
        settleWithTimeout(getHomePageStats(), PUBLIC_DB_QUERY_MS),
        settleWithTimeout(listScheduledLiveSessions({ limit: 5, offset: 0 }), PUBLIC_DB_QUERY_MS),
      ]);
      recent = rr.status === "fulfilled" ? rr.value : [];
      livePeek = rl.status === "fulfilled" ? rl.value : [];
      homeStats = hs.status === "fulfilled" ? hs.value : null;
      upcomingScheduled = up.status === "fulfilled" ? up.value : [];
      if (rr.status === "rejected") {
        recentLoadError = rr.reason instanceof Error ? rr.reason.message : String(rr.reason);
      }
      if (rl.status === "rejected") {
        livePeekError = rl.reason instanceof Error ? rl.reason.message : String(rl.reason);
      }
      if (
        rr.status === "rejected" &&
        rl.status === "rejected" &&
        hs.status === "rejected" &&
        up.status === "rejected"
      ) {
        databaseLoadError = rr.reason instanceof Error ? rr.reason.message : String(rr.reason);
      }

      if (sessionUser) {
        try {
          favouriteTeams = await withTimeout(
            listFavouriteTeamsForProfile(sessionUser.id, 8),
            15_000
          );
        } catch {
          favouriteTeams = [];
        }
      }
    } catch (e) {
      databaseLoadError = e instanceof Error ? e.message : "Database connection failed";
      if (process.env.NODE_ENV === "development") {
        console.error("[home] database load failed:", e);
      }
    }
  }

  return (
    <div className="space-y-4">
      {databaseLoadError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">Could not load data from the database</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {process.env.NODE_ENV === "development" ? (
              <p className="break-words font-mono text-xs text-destructive/90">{databaseLoadError}</p>
            ) : null}
            <p className="text-muted-foreground">
              Check <code className="rounded bg-background px-1 py-0.5 text-xs">DATABASE_URL</code>. For Supabase{" "}
              <strong>transaction pooler</strong> (port <code className="text-xs">6543</code>), the user must be{" "}
              <code className="rounded bg-background px-1 py-0.5 text-xs">postgres.&lt;project-ref&gt;</code> — not
              plain <code className="rounded bg-background px-1 py-0.5 text-xs">postgres</code>.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-5 sm:space-y-6">
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          NOTE: This is a BETA version. Expect errors and irritations. Please use the{" "}
          <Link href="/feedback" className="underline underline-offset-2">
            feedback section
          </Link>{" "}
          to help us improve.
        </p>
        <HomeHeroSection stats={homeStats} />
        {isDatabaseConfigured() ? <HomeLiveScoresPeek sessions={livePeek} loadError={livePeekError} /> : null}
        <div className="space-y-3">
          <h2 className="text-left text-lg font-semibold">Browse by sport</h2>
          <HomeSportPickTiles />
        </div>
        {isDatabaseConfigured() ? <HomeUpcomingScheduledLoadMore initialSessions={upcomingScheduled} /> : null}
        {favouriteTeams.length > 0 ? <HomeFavouriteTeamsPeek rows={favouriteTeams} /> : null}
      </section>

      <section className="space-y-3">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-semibold">Recent verified scores</h2>
            <p className="text-sm text-muted-foreground">Latest moderator-approved results.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <LinkButton variant="outline" size="sm" href="/verified">
              Provinces &amp; search
            </LinkButton>
            <LinkButton variant="outline" size="sm" href="/results">
              View all
            </LinkButton>
          </div>
        </div>
        {recentLoadError ? (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="space-y-2 py-6 text-sm">
              <p className="font-medium text-destructive">Recent results timed out or failed to load.</p>
              {process.env.NODE_ENV === "development" ? (
                <p className="break-words font-mono text-xs text-destructive/90">{recentLoadError}</p>
              ) : null}
              {isStatementTimeoutMessage(recentLoadError) ? (
                <p className="text-muted-foreground">
                  Run the latest SQL migration in Supabase: it adds index{" "}
                  <code className="rounded bg-background px-1 text-xs">results_verified_published_at_idx</code> — see{" "}
                  <code className="text-xs">supabase/migrations/00002_results_verified_published_idx.sql</code>.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  If this persists, confirm migrations are applied and <code className="text-xs">DATABASE_URL</code>{" "}
                  points at your Supabase pooler.
                </p>
              )}
            </CardContent>
          </Card>
        ) : recent.length === 0 && !databaseLoadError ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No verified results yet. Seed the database or approve submissions in moderation.
            </CardContent>
          </Card>
        ) : (
          <HomeRecentVerifiedLoadMore initialRows={recent} />
        )}
      </section>

      <section className="rounded-lg border bg-primary/5 p-6 text-center sm:text-left">
        <h2 className="text-lg font-semibold">Have a score we&apos;re missing?</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in and submit with optional photo or PDF evidence. Our moderators review every entry.
        </p>
        <LinkButton className="mt-4" href="/submit">
          Submit a score
        </LinkButton>
      </section>

      <p className="text-center text-sm text-muted-foreground sm:text-left">
        <Link href="/live" className="text-primary underline-offset-4 hover:underline">
          Live scoring hub
        </Link>
        {" · "}
        <Link href="/find-school" className="text-primary underline-offset-4 hover:underline">
          Find a school
        </Link>
      </p>
    </div>
  );
}
