import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSessionUser } from "@/lib/auth";
import { getRecentVerifiedResults } from "@/lib/data/results";
import { listUnderwayLiveSessions, type LiveSessionPublic } from "@/lib/data/live-sessions";
import { listFavouriteTeamsForProfile, type FavouriteTeamRow } from "@/lib/data/favourite-teams";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { HomeSportPickTiles } from "@/components/home-sport-pick-tiles";
import { HomeLiveScoresPeek } from "@/components/home-live-scores-peek";
import { HomeFavouriteTeamsPeek } from "@/components/home-favourite-teams";
import { RecentVerifiedScoreCards } from "@/components/recent-verified-score-cards";
import { withTimeout } from "@/lib/with-timeout";
import { PUBLIC_DB_QUERY_MS } from "@/lib/public-db-timeout";

function isStatementTimeoutMessage(msg: string): boolean {
  return /statement timeout|57014|canceling statement/i.test(msg);
}

export default async function HomePage() {
  let recent: Awaited<ReturnType<typeof getRecentVerifiedResults>> = [];
  let livePeek: LiveSessionPublic[] = [];
  let databaseLoadError: string | null = null;
  let recentLoadError: string | null = null;
  let livePeekError: string | null = null;
  let favouriteTeams: FavouriteTeamRow[] = [];

  if (isDatabaseConfigured()) {
    try {
      const sessionUser = await getSessionUser();
      const settled = await withTimeout(
        Promise.allSettled([
          getRecentVerifiedResults(8),
          listUnderwayLiveSessions({ limit: 5 }),
          sessionUser ? listFavouriteTeamsForProfile(sessionUser.id, 8) : Promise.resolve([] as FavouriteTeamRow[]),
        ]),
        PUBLIC_DB_QUERY_MS
      );
      const [rr, rl, ft] = settled;
      recent = rr.status === "fulfilled" ? rr.value : [];
      livePeek = rl.status === "fulfilled" ? rl.value : [];
      favouriteTeams = ft.status === "fulfilled" ? ft.value : [];
      if (rr.status === "rejected") {
        recentLoadError = rr.reason instanceof Error ? rr.reason.message : String(rr.reason);
      }
      if (rl.status === "rejected") {
        livePeekError = rl.reason instanceof Error ? rl.reason.message : String(rl.reason);
      }
    } catch (e) {
      databaseLoadError = e instanceof Error ? e.message : "Database connection failed";
      if (process.env.NODE_ENV === "development") {
        console.error("[home] database load failed:", e);
      }
    }
  }

  return (
    <div className="space-y-5">
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

      <section className="space-y-3">
        <HomeSportPickTiles />
        {isDatabaseConfigured() ? <HomeLiveScoresPeek sessions={livePeek} loadError={livePeekError} /> : null}
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
          <RecentVerifiedScoreCards rows={recent} />
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
