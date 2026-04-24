import Link from "next/link";
import { format } from "date-fns";
import { SchoolLogo } from "@/components/school-logo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VerificationBadge } from "@/components/verification-badge";
import { ScoreCardSportIcons } from "@/components/score-card-sport-icons";
import { SuperSportsRecordingLink } from "@/components/super-sports-recording-link";
import type { SchoolSport } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";
import { cn } from "@/lib/utils";
import {
  scoreResultCardClass,
  scoreResultCardHoverClass,
  SCORE_DUMMY_HEADER_BAND_CLASS,
} from "@/lib/score-result-frame";

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
  /** When true, card uses dummy/test styling. */
  isDummy?: boolean;
};

export function RecentVerifiedScoreCards({
  rows,
  variant = "default",
}: {
  rows: RecentVerifiedRow[];
  variant?: "default" | "compact";
}) {
  if (rows.length === 0) return null;
  const compact = variant === "compact";
  return (
    <div
      className={cn(
        "mx-auto grid w-full gap-3",
        compact
          ? "max-w-6xl grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2"
          : "max-w-4xl grid-cols-1 sm:grid-cols-2 gap-3"
      )}
    >
      {rows.map((r) => (
        <Card
          key={r.resultId}
          className={cn(
            scoreResultCardClass(r.isDummy),
            "relative overflow-hidden transition-colors",
            scoreResultCardHoverClass(r.isDummy),
            compact && "shadow-sm"
          )}
        >
          <ScoreCardSportIcons sport={r.sport} teamGender={r.teamGender} />
          <Link
            href={`/matches/${r.fixtureId}`}
            className="absolute inset-0 z-[1] rounded-lg ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label={`Open match: ${r.homeSchoolName} vs ${r.awaySchoolName}`}
          />
          <CardHeader
            className={cn(
              "relative z-[2] border-b pointer-events-none",
              r.isDummy ? SCORE_DUMMY_HEADER_BAND_CLASS : "bg-muted/30",
              compact ? "px-2.5 py-2.5" : "px-4 py-4"
            )}
          >
            <div className={cn("absolute z-[3]", compact ? "right-2 top-2" : "right-3 top-3")}>
              <VerificationBadge level={r.verificationLevel} compact isDummy={r.isDummy} />
            </div>
            <CardTitle
              className={cn(
                "text-center font-medium leading-snug",
                compact ? "pr-8 text-xs" : "pr-10 text-base"
              )}
            >
              <span className="inline-flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
                <span className="inline-flex items-center gap-1.5">
                  <SchoolLogo logoPath={r.homeSchoolLogoPath} alt="" size={compact ? "sm" : "md"} />
                  <Link
                    href={`/schools/${r.homeSchoolSlug}`}
                    className="relative z-[2] cursor-pointer hover:underline pointer-events-auto"
                  >
                    {r.homeSchoolName}
                  </Link>
                </span>
                <span className="shrink-0 text-muted-foreground">vs</span>
                <span className="inline-flex items-center gap-1.5">
                  <SchoolLogo logoPath={r.awaySchoolLogoPath} alt="" size={compact ? "sm" : "md"} />
                  <Link
                    href={`/schools/${r.awaySchoolSlug}`}
                    className="relative z-[2] cursor-pointer hover:underline pointer-events-auto"
                  >
                    {r.awaySchoolName}
                  </Link>
                </span>
              </span>
            </CardTitle>
            {r.recordingUrl ? (
              <p
                className={cn(
                  "relative z-[2] text-center pointer-events-auto",
                  compact ? "mt-1.5 text-[10px]" : "mt-3 text-xs"
                )}
              >
                <SuperSportsRecordingLink href={r.recordingUrl} />
              </p>
            ) : null}
          </CardHeader>
          <CardContent
            className={cn(
              "relative z-[2] flex flex-col items-center gap-1.5 text-center pointer-events-none",
              compact ? "px-2.5 pb-4 pt-2 text-[11px]" : "gap-2 px-4 pb-8 pt-4 text-sm"
            )}
          >
            <span
              className={cn(
                "font-mono font-semibold tabular-nums",
                compact ? "text-3xl" : "text-4xl"
              )}
            >
              {r.homeScore} – {r.awayScore}
            </span>
            <div className={cn("text-muted-foreground", compact ? "space-y-0 text-[11px]" : "")}>
              <div>{r.competitionName ?? "—"}</div>
              <div>{r.seasonName ?? "—"}</div>
              <div>
                {r.matchDate ? format(new Date(r.matchDate + "T12:00:00"), "d MMM yyyy") : ""}
              </div>
            </div>
            <span
              className={cn(
                "text-primary underline-offset-4",
                compact ? "mt-0 text-[11px]" : "mt-1 text-sm"
              )}
            >
              Match details
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
