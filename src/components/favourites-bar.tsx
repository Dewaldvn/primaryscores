import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import { listFavouriteSchoolsForProfile } from "@/lib/data/favourite-schools";
import { getRecentVerifiedResultsForSchoolIds } from "@/lib/data/results";
import { listUnderwayLiveSessions } from "@/lib/data/live-sessions";
import { SchoolLogo } from "@/components/school-logo";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent } from "@/components/ui/card";
import { isDatabaseConfigured } from "@/lib/db-safe";

/** Full “my schools” panel: favourites, recent verified, live name matches. Used on `/my-schools`. */
export async function MySchoolsContent() {
  if (!isDatabaseConfigured()) {
    return (
      <p className="text-sm text-muted-foreground">
        Database is not configured.
      </p>
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return null;
  }

  const favs = await listFavouriteSchoolsForProfile(user.id);
  if (favs.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-4 py-10 text-center text-sm text-muted-foreground">
          <p>You have not added any favourite schools yet. Search for a school and tap the star on its page.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <LinkButton href="/find-school" variant="default" size="sm">
              Find schools
            </LinkButton>
            <LinkButton href="/account" variant="outline" size="sm">
              Account
            </LinkButton>
          </div>
        </CardContent>
      </Card>
    );
  }

  const ids = favs.map((f) => f.schoolId);
  const namesLower = new Set(favs.map((f) => f.displayName.toLowerCase()));

  const [recent, liveAll] = await Promise.all([
    getRecentVerifiedResultsForSchoolIds(ids, 6),
    listUnderwayLiveSessions({ limit: 40 }),
  ]);

  const nameList = Array.from(namesLower);
  const live = liveAll.filter((s) =>
    nameList.some(
      (n) =>
        s.homeTeamName.toLowerCase().includes(n) ||
        s.awayTeamName.toLowerCase().includes(n) ||
        n.includes(s.homeTeamName.toLowerCase()) ||
        n.includes(s.awayTeamName.toLowerCase())
    )
  );

  return (
    <section className="rounded-lg border bg-muted/20 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Your schools</h2>
        <LinkButton href="/account" variant="outline" size="sm">
          Manage in account
        </LinkButton>
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {favs.map((f) => (
          <Link
            key={f.schoolId}
            href={`/schools/${f.slug}`}
            className="inline-flex items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-xs font-medium hover:bg-muted"
          >
            <SchoolLogo logoPath={f.logoPath} alt="" size="xs" />
            <span className="max-w-[10rem] truncate">{f.displayName}</span>
          </Link>
        ))}
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {recent.length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Recent verified involving them
            </p>
            <ul className="space-y-2 text-sm">
              {recent.map((r) => (
                <li key={r.resultId}>
                  <Link href={`/matches/${r.fixtureId}`} className="hover:underline">
                    <span className="font-medium">
                      {r.homeSchoolName} {r.homeScore}–{r.awayScore} {r.awaySchoolName}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No recent verified results for these schools yet.</p>
        )}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Live games (name match)</p>
          {live.length === 0 ? (
            <p className="text-sm text-muted-foreground">No open live games match right now.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {live.slice(0, 5).map((s) => (
                <li key={s.id}>
                  <Link href={`/live/${s.id}`} className="hover:underline">
                    {s.homeTeamName} vs {s.awayTeamName}
                    {s.majority ? (
                      <span className="ml-1 font-mono text-muted-foreground">
                        ({s.majority.homeScore}–{s.majority.awayScore})
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            <Link href="/live" className="text-primary underline-offset-4 hover:underline">
              All live games
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
