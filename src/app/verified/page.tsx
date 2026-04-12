import Link from "next/link";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listProvinces } from "@/lib/data/schools";
import { getRecentVerifiedResults } from "@/lib/data/results";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { RecentVerifiedScoreCards } from "@/components/recent-verified-score-cards";
import { withTimeout } from "@/lib/with-timeout";
import { PUBLIC_DB_QUERY_MS } from "@/lib/public-db-timeout";

function isStatementTimeoutMessage(msg: string): boolean {
  return /statement timeout|57014|canceling statement/i.test(msg);
}

export const metadata = {
  title: "Verified scores",
  description: "Browse verified primary school rugby results by province and see recent verified scores.",
};

export default async function VerifiedScoresPage() {
  let provinces: Awaited<ReturnType<typeof listProvinces>> = [];
  let recent: Awaited<ReturnType<typeof getRecentVerifiedResults>> = [];
  let databaseLoadError: string | null = null;
  let provincesLoadError: string | null = null;
  let recentLoadError: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      const settled = await withTimeout(
        Promise.allSettled([listProvinces(), getRecentVerifiedResults(12)]),
        PUBLIC_DB_QUERY_MS
      );
      const [rp, rr] = settled;
      provinces = rp.status === "fulfilled" ? rp.value : [];
      recent = rr.status === "fulfilled" ? rr.value : [];
      if (rp.status === "rejected") {
        provincesLoadError = rp.reason instanceof Error ? rp.reason.message : String(rp.reason);
      }
      if (rr.status === "rejected") {
        recentLoadError = rr.reason instanceof Error ? rr.reason.message : String(rr.reason);
      }
    } catch (e) {
      databaseLoadError = e instanceof Error ? e.message : "Database connection failed";
    }
  }

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Verified scores</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Explore the archive by province or search schools and competitions.
        </p>
      </div>

      {databaseLoadError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">Could not load data from the database</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {process.env.NODE_ENV === "development" ? (
              <p className="break-words font-mono text-xs text-destructive/90">{databaseLoadError}</p>
            ) : null}
            <p>Check DATABASE_URL and that migrations are applied.</p>
          </CardContent>
        </Card>
      ) : null}

      {!databaseLoadError && provincesLoadError ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-base text-destructive">Could not load provinces</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {process.env.NODE_ENV === "development" ? (
              <p className="mb-2 break-words font-mono text-xs text-destructive/90">{provincesLoadError}</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      <section className="space-y-4 text-center sm:text-left">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          South Africa · U13 primary schools
        </p>
        <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Verified rugby scores you can trust
        </h2>
        <p className="max-w-2xl text-muted-foreground">
          Browse historical results by province, school, and season. Contributors submit scores with evidence;
          moderators verify before anything goes live.
        </p>
        <form action="/results" className="flex max-w-xl flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search school or competition…"
              className="pl-9"
              aria-label="Search results"
            />
          </div>
          <Button type="submit" className="sm:w-auto">
            Search archive
          </Button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Provinces</h2>
        {provinces.length === 0 && !databaseLoadError && !provincesLoadError ? (
          <p className="text-sm text-muted-foreground">
            Configure DATABASE_URL and run the seed script to load provinces.
          </p>
        ) : provinces.length === 0 ? null : (
          <div className="flex flex-wrap gap-2">
            {provinces.map((p) => (
              <LinkButton key={p.id} variant="outline" size="sm" href={`/results?province=${p.id}`}>
                {p.name}
              </LinkButton>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-lg font-semibold">Recent verified scores</h2>
            <p className="text-sm text-muted-foreground">Latest moderator-approved results (same feed as the home page).</p>
          </div>
          <LinkButton variant="outline" size="sm" href="/results">
            View all
          </LinkButton>
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
                  Ensure the results published-at index migration is applied on your database.
                </p>
              ) : null}
            </CardContent>
          </Card>
        ) : recent.length === 0 && !databaseLoadError ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No verified results yet.
            </CardContent>
          </Card>
        ) : (
          <RecentVerifiedScoreCards rows={recent} />
        )}
      </section>

      <p className="text-center text-sm text-muted-foreground sm:text-left">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
