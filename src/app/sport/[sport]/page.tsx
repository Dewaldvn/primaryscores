import Link from "next/link";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/link-button";
import { HomeLiveScoresPeek } from "@/components/home-live-scores-peek";
import { RecentVerifiedScoreCards } from "@/components/recent-verified-score-cards";
import { SportHubActionTiles } from "@/components/sport-hub-action-tiles";
import { getRecentVerifiedResultsBySport } from "@/lib/data/results";
import { listUnderwayLiveSessions, type LiveSessionPublic } from "@/lib/data/live-sessions";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { PUBLIC_DB_QUERY_MS } from "@/lib/public-db-timeout";
import { withTimeout } from "@/lib/with-timeout";
import { SPORT_ROUTE_SLUGS, schoolSportLabel, sportFromRouteSlug } from "@/lib/sports";

type Props = { params: { sport: string } };

export function generateStaticParams() {
  return SPORT_ROUTE_SLUGS.map((sport) => ({ sport }));
}

export function generateMetadata({ params }: Props) {
  const sport = sportFromRouteSlug(params.sport);
  if (!sport) return { title: "Sport" };
  return {
    title: `${schoolSportLabel(sport)} — Primary school scores`,
    description: `Live scoring, submissions, verified results, and school search for ${schoolSportLabel(sport)}.`,
  };
}

export default async function SportHubPage({ params }: Props) {
  const sport = sportFromRouteSlug(params.sport);
  if (!sport) notFound();

  let livePeek: LiveSessionPublic[] = [];
  let recent: Awaited<ReturnType<typeof getRecentVerifiedResultsBySport>> = [];
  let livePeekError: string | null = null;
  let recentError: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      const settled = await withTimeout(
        Promise.allSettled([
          listUnderwayLiveSessions({ sport, limit: 5 }),
          getRecentVerifiedResultsBySport(sport, 8),
        ]),
        PUBLIC_DB_QUERY_MS
      );
      const [rl, rr] = settled;
      livePeek = rl.status === "fulfilled" ? rl.value : [];
      recent = rr.status === "fulfilled" ? rr.value : [];
      if (rl.status === "rejected") {
        livePeekError = rl.reason instanceof Error ? rl.reason.message : String(rl.reason);
      }
      if (rr.status === "rejected") {
        recentError = rr.reason instanceof Error ? rr.reason.message : String(rr.reason);
      }
    } catch {
      livePeekError = livePeekError ?? "Could not load live games.";
      recentError = recentError ?? "Could not load results.";
    }
  }

  const resultsHref = `/results?sport=${sport}`;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← All sports
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">{schoolSportLabel(sport)}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Live scoring, past scores, verified results, and school search for this sport.
        </p>
      </div>
      <SportHubActionTiles sport={sport} />

      {isDatabaseConfigured() ? (
        <div className="space-y-8">
          <HomeLiveScoresPeek sessions={livePeek} loadError={livePeekError} sportFilter={sport} />

          <section className="space-y-3">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-lg font-semibold">Recent verified scores</h2>
                <p className="text-sm text-muted-foreground">
                  Latest moderator-approved results for {schoolSportLabel(sport)} fixtures.
                </p>
              </div>
              <LinkButton variant="outline" size="sm" href={resultsHref}>
                View all in archive
              </LinkButton>
            </div>
            {recentError ? (
              <p className="text-sm text-destructive">
                Could not load recent results.
                {process.env.NODE_ENV === "development" ? (
                  <span className="mt-1 block font-mono text-xs">{recentError}</span>
                ) : null}
              </p>
            ) : recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No verified published results for this sport yet. Try the archive or another sport.
              </p>
            ) : (
              <RecentVerifiedScoreCards rows={recent} />
            )}
          </section>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Connect the database to see live games and recent results here.
        </p>
      )}
    </div>
  );
}
