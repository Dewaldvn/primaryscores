import Link from "next/link";
import { notFound } from "next/navigation";
import { SchoolLogo } from "@/components/school-logo";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import {
  getSchoolBySlug,
  getU13TeamsForSchool,
  getVerifiedResultsForSchool,
  getSchoolSeasonSummary,
} from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { SuperSportsRecordingLink } from "@/components/super-sports-recording-link";
import { getSessionUser } from "@/lib/auth";
import { isSchoolFavourited } from "@/lib/data/favourite-schools";
import { SchoolFavouriteButton } from "@/components/school-favourite-button";

type Props = { params: { slug: string } };

export default async function SchoolPage({ params }: Props) {
  if (!isDatabaseConfigured()) notFound();

  const school = await getSchoolBySlug(params.slug);
  if (!school) notFound();

  const user = await getSessionUser();
  const favourited = user ? await isSchoolFavourited(user.id, school.id) : false;

  const [teams, results, summary] = await Promise.all([
    getU13TeamsForSchool(school.id),
    getVerifiedResultsForSchool(school.id, 40),
    getSchoolSeasonSummary(school.id),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">{school.provinceName}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold">
            <SchoolLogo logoPath={school.logoPath} alt="" size="xl" />
            {school.displayName}
          </h1>
          <SchoolFavouriteButton
            schoolId={school.id}
            signedIn={Boolean(user)}
            initialFavourited={favourited}
            loginRedirectPath={`/schools/${params.slug}`}
          />
        </div>
        <p className="text-sm text-muted-foreground">{school.officialName}</p>
        {(school.town || school.district) && (
          <p className="mt-1 text-sm">
            {school.town}
            {school.town && school.district ? " · " : ""}
            {school.district}
          </p>
        )}
        {school.website && (
          <a
            href={school.website}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-block text-sm text-primary hover:underline"
          >
            School website
          </a>
        )}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-semibold">U13 teams</h2>
        {teams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active U13 teams on record.</p>
        ) : (
          <ul className="list-inside list-disc text-sm">
            {teams.map((t) => (
              <li key={t.id}>
                {t.teamLabel} {t.isFirstTeam ? "(first side)" : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Seasonal activity</h2>
        {summary.length === 0 ? (
          <p className="text-sm text-muted-foreground">No verified fixtures recorded yet.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map((s, idx) => (
              <Card key={s.seasonId ?? `no-season-${idx}`}>
                <CardHeader className="py-3">
                  <CardTitle className="text-base">
                    {s.seasonName ?? "Season not set"}{" "}
                    <span className="font-normal text-muted-foreground">
                      ({s.seasonYear ?? "—"})
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-3 text-sm text-muted-foreground">
                  {s.played} verified {s.played === 1 ? "match" : "matches"}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Match history</h2>
        {results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No verified results to show.</p>
        ) : (
          <ul className="space-y-3">
            {results.map((r) => (
              <li key={r.resultId}>
                <Card>
                  <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <SchoolLogo logoPath={r.homeSchoolLogoPath} alt="" size="sm" />
                          <Link href={`/schools/${r.homeSchoolSlug}`} className="hover:underline">
                            {r.homeSchoolName}
                          </Link>
                        </span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="inline-flex items-center gap-2">
                          <SchoolLogo logoPath={r.awaySchoolLogoPath} alt="" size="sm" />
                          <Link href={`/schools/${r.awaySchoolSlug}`} className="hover:underline">
                            {r.awaySchoolName}
                          </Link>
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.matchDate
                          ? format(new Date(r.matchDate + "T12:00:00"), "d MMM yyyy")
                          : ""}
                      </div>
                      {r.recordingUrl ? (
                        <div className="mt-1">
                          <SuperSportsRecordingLink href={r.recordingUrl} className="text-xs" />
                        </div>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={
                            r.isHome ? "font-semibold text-primary" : "font-mono tabular-nums"
                          }
                        >
                          {r.homeScore}
                        </span>
                        <span className="text-muted-foreground">–</span>
                        <span
                          className={
                            !r.isHome ? "font-semibold text-primary" : "font-mono tabular-nums"
                          }
                        >
                          {r.awayScore}
                        </span>
                      </div>
                      <VerificationBadge level={r.verificationLevel} />
                      <Link
                        href={`/matches/${r.fixtureId}`}
                        className="text-sm text-primary hover:underline"
                      >
                        Details
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
