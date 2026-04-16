import Link from "next/link";
import { notFound } from "next/navigation";
import { SchoolLogo } from "@/components/school-logo";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import { getMatchDetails } from "@/lib/data/results";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { getSessionUser } from "@/lib/auth";
import { DisputeScoreDialog } from "@/components/dispute-score-dialog";
import { ScoreCardSportIcons } from "@/components/score-card-sport-icons";
import { SuperSportsRecordingLink } from "@/components/super-sports-recording-link";

type Props = { params: { id: string } };

export default async function MatchPage({ params }: Props) {
  if (!isDatabaseConfigured()) notFound();

  const user = await getSessionUser();
  const signedIn = Boolean(user);

  const row = await getMatchDetails(params.id);
  if (!row?.resultId || !row.isVerified || !row.publishedAt) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            {[row.competitionName, row.seasonName, row.seasonYear != null ? `(${row.seasonYear})` : null]
              .filter((x) => x != null && String(x).length > 0)
              .join(" · ") || "Season / competition not set"}
          </p>
          <VerificationBadge level={row.verificationLevel ?? "SUBMITTED"} />
        </div>
        <h1 className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-center text-2xl font-bold">
          <span className="inline-flex items-center gap-3">
            <SchoolLogo logoPath={row.homeSchoolLogoPath} alt="" size="lg" />
            <Link href={`/schools/${row.homeSchoolSlug}`} className="hover:underline">
              {row.homeSchoolName}
            </Link>
          </span>
          <span className="shrink-0 text-muted-foreground">vs</span>
          <span className="inline-flex items-center gap-3">
            <SchoolLogo logoPath={row.awaySchoolLogoPath} alt="" size="lg" />
            <Link href={`/schools/${row.awaySchoolSlug}`} className="hover:underline">
              {row.awaySchoolName}
            </Link>
          </span>
        </h1>
        <p className="text-center text-sm text-muted-foreground">
          {row.matchDate
            ? format(new Date(row.matchDate + "T12:00:00"), "EEEE d MMMM yyyy")
            : ""}
          {row.venue ? ` · ${row.venue}` : ""}
        </p>
      </div>

      <Card className="relative">
        <ScoreCardSportIcons sport={row.sport} teamGender={row.teamGender} />
        <CardHeader className="justify-items-center text-center">
          <CardTitle className="text-lg">Final score</CardTitle>
        </CardHeader>
        <CardContent className="pb-10 text-center">
          <p className="font-mono text-4xl font-bold tabular-nums">
            {row.homeScore} – {row.awayScore}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {row.homeTeamLabel} vs {row.awayTeamLabel}
          </p>
          {row.recordingUrl ? (
            <div className="mt-3 flex justify-center">
              <SuperSportsRecordingLink href={row.recordingUrl} className="text-sm" />
            </div>
          ) : null}
          <div className="mt-3">
            <DisputeScoreDialog
              fixtureId={row.fixtureId}
              resultId={row.resultId}
              homeSchoolName={row.homeSchoolName}
              awaySchoolName={row.awaySchoolName}
              homeTeamLabel={row.homeTeamLabel ?? "Team 1"}
              awayTeamLabel={row.awayTeamLabel ?? "Team 2"}
              homeScore={row.homeScore ?? 0}
              awayScore={row.awayScore ?? 0}
              signedIn={signedIn}
              loginRedirectTo={`/matches/${row.fixtureId}`}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
