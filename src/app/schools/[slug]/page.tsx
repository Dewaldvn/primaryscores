import Link from "next/link";
import { notFound } from "next/navigation";
import { SchoolLogo } from "@/components/school-logo";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import {
  getSchoolBySlug,
  listActiveTeamsForSchool,
  getVerifiedResultsForSchool,
  getSchoolSeasonSummary,
} from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { ScoreCardSportIcons } from "@/components/score-card-sport-icons";
import { SuperSportsRecordingLink } from "@/components/super-sports-recording-link";
import { getSessionUser } from "@/lib/auth";
import { isSchoolFavourited } from "@/lib/data/favourite-schools";
import { filterFavouritedTeamIds } from "@/lib/data/favourite-teams";
import { SchoolFavouriteButton } from "@/components/school-favourite-button";
import { TeamFavouriteButton } from "@/components/team-favourite-button";
import { formatTeamListingSubtitle } from "@/lib/format-team";
import { SCHOOL_SPORTS, schoolSportLabel, type SchoolSport } from "@/lib/sports";
import { compareTeamsBySportAndChronologicalAge } from "@/lib/team-sort";

type Props = { params: { slug: string } };

export default async function SchoolPage({ params }: Props) {
  if (!isDatabaseConfigured()) notFound();

  const school = await getSchoolBySlug(params.slug);
  if (!school) notFound();

  const user = await getSessionUser();
  const favouritedSchool = user ? await isSchoolFavourited(user.id, school.id) : false;

  const [schoolTeams, results, summary] = await Promise.all([
    listActiveTeamsForSchool(school.id),
    getVerifiedResultsForSchool(school.id, 40),
    getSchoolSeasonSummary(school.id),
  ]);

  const favouritedTeamIds =
    user && schoolTeams.length > 0
      ? await filterFavouritedTeamIds(
          user.id,
          schoolTeams.map((t) => t.id)
        )
      : new Set<string>();
  const orderedSchoolTeams = [...schoolTeams].sort((a, b) =>
    compareTeamsBySportAndChronologicalAge(
      {
        sport: a.sport as SchoolSport,
        ageGroup: a.ageGroup,
        gender: a.gender,
        teamLabel: a.teamLabel,
      },
      {
        sport: b.sport as SchoolSport,
        ageGroup: b.ageGroup,
        gender: b.gender,
        teamLabel: b.teamLabel,
      },
    ),
  );

  const loginPath = `/schools/${params.slug}`;

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
            initialFavourited={favouritedSchool}
            loginRedirectPath={loginPath}
          />
        </div>
        <p className="text-sm text-muted-foreground">{school.officialName}</p>
        {school.town && (
          <p className="mt-1 text-sm">
            {school.town}
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

      <section id="teams" className="scroll-mt-24">
        <h2 className="mb-3 text-lg font-semibold">Teams</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Active sides on record for this school. Favourite a specific team to show it on your home page and under{" "}
          <strong>My favourites</strong> in the account menu.
        </p>
        {orderedSchoolTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active teams on record yet.</p>
        ) : (
          <div className="space-y-4">
            {SCHOOL_SPORTS.map((sport) => {
              const sportTeams = orderedSchoolTeams.filter((t) => t.sport === sport);
              if (sportTeams.length === 0) return null;
              return (
                <div key={sport} className="space-y-2">
                  <h3 className="text-sm font-semibold text-foreground">{schoolSportLabel(sport)}</h3>
                  <ul className="space-y-2">
                    {sportTeams.map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2.5 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">
                            {formatTeamListingSubtitle({
                              sport: t.sport as SchoolSport,
                              ageGroup: t.ageGroup,
                              teamLabel: t.teamLabel,
                              gender: t.gender,
                            })}
                          </p>
                        </div>
                        <TeamFavouriteButton
                          teamId={t.id}
                          signedIn={Boolean(user)}
                          initialFavourited={favouritedTeamIds.has(t.id)}
                          loginRedirectPath={`${loginPath}#teams`}
                          compact
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
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
                <Card className="relative">
                  <ScoreCardSportIcons sport={r.sport} teamGender={r.teamGender} />
                  <CardContent className="flex flex-col gap-2 pb-8 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
