import Link from "next/link";
import { format } from "date-fns";
import { AdminPublicShortcuts } from "@/components/admin-public-shortcuts";
import { SchoolLogo } from "@/components/school-logo";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VerificationBadge } from "@/components/verification-badge";
import { listProvinces } from "@/lib/data/schools";
import { getRecentVerifiedResults } from "@/lib/data/results";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { withTimeout } from "@/lib/with-timeout";
import { PUBLIC_DB_QUERY_MS } from "@/lib/public-db-timeout";

function isStatementTimeoutMessage(msg: string): boolean {
  return /statement timeout|57014|canceling statement/i.test(msg);
}

export default async function HomePage() {
  let provinces: Awaited<ReturnType<typeof listProvinces>> = [];
  let recent: Awaited<ReturnType<typeof getRecentVerifiedResults>> = [];
  /** Whole-page failure (e.g. request timeout before any query settled). */
  let databaseLoadError: string | null = null;
  /** One query failed; the other may still have data. */
  let provincesLoadError: string | null = null;
  let recentLoadError: string | null = null;

  if (isDatabaseConfigured()) {
    try {
      const settled = await withTimeout(
        Promise.allSettled([listProvinces(), getRecentVerifiedResults(8)]),
        PUBLIC_DB_QUERY_MS
      );
      const [rp, rr] = settled;
      provinces = rp.status === "fulfilled" ? rp.value : [];
      recent = rr.status === "fulfilled" ? rr.value : [];
      if (rp.status === "rejected") {
        provincesLoadError =
          rp.reason instanceof Error ? rp.reason.message : String(rp.reason);
      }
      if (rr.status === "rejected") {
        recentLoadError =
          rr.reason instanceof Error ? rr.reason.message : String(rr.reason);
      }
    } catch (e) {
      databaseLoadError = e instanceof Error ? e.message : "Database connection failed";
      if (process.env.NODE_ENV === "development") {
        console.error("[home] database load failed:", e);
      }
    }
  }

  return (
    <div className="space-y-12">
      <AdminPublicShortcuts
        links={[
          { href: "/admin/scores", label: "Scores" },
          { href: "/admin/seasons", label: "Seasons & competitions" },
          { href: "/admin/schools", label: "Schools" },
        ]}
      />
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
              plain <code className="rounded bg-background px-1 py-0.5 text-xs">postgres</code>. Use the database
              password from Supabase (Connect → Transaction pooler URI; reset DB password under Project Settings → Database if needed). Then run{" "}
              <code className="rounded bg-background px-1 py-0.5 text-xs">npm run db:seed</code>.
            </p>
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
            <p>Check <code className="text-xs">DATABASE_URL</code> and that migrations are applied.</p>
          </CardContent>
        </Card>
      ) : null}
      <section className="space-y-4 text-center sm:text-left">
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          South Africa · U13 primary schools
        </p>
        <h1 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">
          Verified rugby scores you can trust
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          Browse historical results by province, school, and season. Contributors submit scores with
          evidence; moderators verify before anything goes live.
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
            Configure <code className="text-xs">DATABASE_URL</code> and run the seed script to load provinces.
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
            <p className="text-sm text-muted-foreground">Latest moderator-approved results.</p>
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
                  Run the latest SQL migration in Supabase (SQL Editor): it adds index{" "}
                  <code className="rounded bg-background px-1 text-xs">results_verified_published_at_idx</code> — see{" "}
                  <code className="text-xs">supabase/migrations/00002_results_verified_published_idx.sql</code>. Or run{" "}
                  <code className="text-xs">npx drizzle-kit push</code> against this database.
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
        ) : recent.length === 0 ? null : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map((r) => (
              <Card key={r.resultId} className="overflow-hidden">
                <CardHeader className="border-b bg-muted/30 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base font-medium leading-snug">
                      <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="inline-flex items-center gap-2">
                          <SchoolLogo logoPath={r.homeSchoolLogoPath} alt="" size="md" />
                          <Link href={`/schools/${r.homeSchoolSlug}`} className="hover:underline">
                            {r.homeSchoolName}
                          </Link>
                        </span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="inline-flex items-center gap-2">
                          <SchoolLogo logoPath={r.awaySchoolLogoPath} alt="" size="md" />
                          <Link href={`/schools/${r.awaySchoolSlug}`} className="hover:underline">
                            {r.awaySchoolName}
                          </Link>
                        </span>
                      </span>
                    </CardTitle>
                    <VerificationBadge level={r.verificationLevel} compact />
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                  <span className="font-mono text-lg font-semibold tabular-nums">
                    {r.homeScore} – {r.awayScore}
                  </span>
                  <div className="text-right text-muted-foreground">
                    <div>{r.competitionName ?? "—"}</div>
                    <div>{r.seasonName ?? "—"}</div>
                    <div>
                      {r.matchDate
                        ? format(new Date(r.matchDate + "T12:00:00"), "d MMM yyyy")
                        : ""}
                    </div>
                  </div>
                  <LinkButton variant="link" size="sm" className="h-auto p-0" href={`/matches/${r.fixtureId}`}>
                    Match details
                  </LinkButton>
                </CardContent>
              </Card>
            ))}
          </div>
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
    </div>
  );
}
