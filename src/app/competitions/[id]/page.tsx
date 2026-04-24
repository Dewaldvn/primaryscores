import Link from "next/link";
import { notFound } from "next/navigation";
import { SchoolLogo } from "@/components/school-logo";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import { getCompetition } from "@/lib/data/reference";
import { listVerifiedResults } from "@/lib/data/results";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { ScoreCardSportIcons } from "@/components/score-card-sport-icons";
import { SuperSportsRecordingLink } from "@/components/super-sports-recording-link";
import { cn } from "@/lib/utils";
import {
  SCORE_RESULT_FRAME_CLASS,
  scoreResultCardClass,
  scoreResultCardHoverClass,
} from "@/lib/score-result-frame";

type Props = { params: { id: string } };

export default async function CompetitionDetailPage({ params }: Props) {
  if (!isDatabaseConfigured()) notFound();
  const comp = await getCompetition(params.id);
  if (!comp) notFound();

  const { rows } = await listVerifiedResults({ competitionId: params.id, pageSize: 50 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{comp.name}</h1>
        <p className="text-sm text-muted-foreground">
          {comp.provinceName ?? "Various provinces"}
          {comp.level ? ` · ${comp.level}` : ""}
        </p>
      </div>
      {rows.length === 0 ? (
        <Card className={SCORE_RESULT_FRAME_CLASS}>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No verified results linked to this competition.
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.resultId}>
              <Card
                className={cn(
                  scoreResultCardClass(r.isDummy),
                  "relative transition-colors",
                  scoreResultCardHoverClass(r.isDummy)
                )}
              >
                <ScoreCardSportIcons sport={r.sport} teamGender={r.teamGender} />
                <CardContent className="flex flex-col gap-2 pb-8 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="inline-flex items-center gap-2">
                        <SchoolLogo logoPath={r.homeSchoolLogoPath} alt="" size="sm" />
                        <Link href={`/schools/${r.homeSchoolSlug}`} className="font-medium hover:underline">
                          {r.homeSchoolName}
                        </Link>
                      </span>
                      <span className="text-muted-foreground">vs</span>
                      <span className="inline-flex items-center gap-2">
                        <SchoolLogo logoPath={r.awaySchoolLogoPath} alt="" size="sm" />
                        <Link href={`/schools/${r.awaySchoolSlug}`} className="font-medium hover:underline">
                          {r.awaySchoolName}
                        </Link>
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {r.seasonName} ·{" "}
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-lg font-semibold">
                      {r.homeScore} – {r.awayScore}
                    </span>
                    <VerificationBadge level={r.verificationLevel} compact isDummy={r.isDummy} />
                    <Link href={`/matches/${r.fixtureId}`} className="text-sm text-primary hover:underline">
                      Details
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
