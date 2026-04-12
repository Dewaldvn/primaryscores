import Link from "next/link";
import { format } from "date-fns";
import { SchoolLogo } from "@/components/school-logo";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import { ScoreCardSportIcons } from "@/components/score-card-sport-icons";
import { SuperSportsRecordingLink } from "@/components/super-sports-recording-link";
import type { SchoolSport } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";

export type RecentVerifiedRow = {
  resultId: string;
  fixtureId: string;
  homeScore: number | null;
  awayScore: number | null;
  verificationLevel: "SUBMITTED" | "MODERATOR_VERIFIED" | "SOURCE_VERIFIED";
  matchDate: string | null;
  homeSchoolName: string;
  awaySchoolName: string;
  homeSchoolSlug: string;
  awaySchoolSlug: string;
  homeSchoolLogoPath: string | null;
  awaySchoolLogoPath: string | null;
  competitionName: string | null;
  seasonName: string | null;
  recordingUrl: string | null;
  sport: SchoolSport;
  teamGender: TeamGender | null;
};

export function RecentVerifiedScoreCards({ rows }: { rows: RecentVerifiedRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-1 gap-3 sm:grid-cols-2">
      {rows.map((r) => (
        <Card key={r.resultId} className="relative overflow-hidden">
          <ScoreCardSportIcons sport={r.sport} teamGender={r.teamGender} />
          <CardHeader className="relative border-b bg-muted/30 px-4 py-4">
            <div className="absolute right-3 top-3 z-10">
              <VerificationBadge level={r.verificationLevel} compact />
            </div>
            <CardTitle className="pr-10 text-center text-base font-medium leading-snug">
              <span className="inline-flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
                <span className="inline-flex items-center gap-2">
                  <SchoolLogo logoPath={r.homeSchoolLogoPath} alt="" size="md" />
                  <Link href={`/schools/${r.homeSchoolSlug}`} className="hover:underline">
                    {r.homeSchoolName}
                  </Link>
                </span>
                <span className="shrink-0 text-muted-foreground">vs</span>
                <span className="inline-flex items-center gap-2">
                  <SchoolLogo logoPath={r.awaySchoolLogoPath} alt="" size="md" />
                  <Link href={`/schools/${r.awaySchoolSlug}`} className="hover:underline">
                    {r.awaySchoolName}
                  </Link>
                </span>
              </span>
            </CardTitle>
            {r.recordingUrl ? (
              <p className="mt-3 text-center text-xs">
                <SuperSportsRecordingLink href={r.recordingUrl} />
              </p>
            ) : null}
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-2 px-4 pb-8 pt-4 text-center text-sm">
            <span className="font-mono text-lg font-semibold tabular-nums">
              {r.homeScore} – {r.awayScore}
            </span>
            <div className="text-muted-foreground">
              <div>{r.competitionName ?? "—"}</div>
              <div>{r.seasonName ?? "—"}</div>
              <div>
                {r.matchDate ? format(new Date(r.matchDate + "T12:00:00"), "d MMM yyyy") : ""}
              </div>
            </div>
            <LinkButton variant="link" size="sm" className="mt-1 h-auto p-0" href={`/matches/${r.fixtureId}`}>
              Match details
            </LinkButton>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
