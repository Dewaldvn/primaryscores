import Link from "next/link";
import { format } from "date-fns";
import { LinkButton } from "@/components/link-button";
import { SchoolLogo } from "@/components/school-logo";
import { ScoreCardSportIcons } from "@/components/score-card-sport-icons";
import type { LiveSessionClientRow } from "@/lib/live-session-types";
import { schoolSportLabel } from "@/lib/sports";
import { cn } from "@/lib/utils";
import { SCORE_RESULT_FRAME_CLASS } from "@/lib/score-result-frame";

export function UpcomingScheduledSection({
  sessions,
  variant = "home",
}: {
  sessions: LiveSessionClientRow[];
  variant?: "home" | "live";
}) {
  const heading = variant === "home" ? "Upcoming" : "Scheduled scoreboards";
  const describe =
    variant === "home"
      ? "Crowd scoreboards opening soon. Same sport matchups only — open a session for full detail."
      : "Games scheduled to go live — open near the listed time.";

  return (
    <div
      id="upcoming-scheduled"
      className={cn("scroll-mt-20", SCORE_RESULT_FRAME_CLASS, "rounded-lg bg-muted/15 px-3 py-3 sm:px-4")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight">{heading}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{describe}</p>
        </div>
        {variant === "home" ? (
          <LinkButton href="/live#upcoming-scheduled" variant="outline" size="sm">
            View all scheduled
          </LinkButton>
        ) : null}
      </div>

      {sessions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing scheduled yet. Scoreboards appear here once a school admin or site admin schedules a fixture.
        </p>
      ) : (
        <ul className="mt-2 divide-y rounded-md bg-background/80 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="relative">
              <ScoreCardSportIcons sport={s.sport} teamGender={s.teamGender} className="bottom-2 left-2 z-[2]" />
              <Link
                href={`/live/${s.id}`}
                className="flex flex-col gap-1 px-3 py-2 pl-10 pb-6 hover:bg-muted/60 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:pb-8"
              >
                <span className="min-w-0 flex-1">
                  <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {schoolSportLabel(s.sport)}
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 font-medium leading-snug">
                    <span className="inline-flex items-center gap-1.5">
                      {s.homeLogoPath ? (
                        <SchoolLogo logoPath={s.homeLogoPath} alt="" size="xs" className="shrink-0" />
                      ) : null}
                      <span>{s.homeTeamName}</span>
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="inline-flex items-center gap-1.5">
                      {s.awayLogoPath ? (
                        <SchoolLogo logoPath={s.awayLogoPath} alt="" size="xs" className="shrink-0" />
                      ) : null}
                      <span>{s.awayTeamName}</span>
                    </span>
                  </span>
                  {s.venue?.trim() ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">{s.venue}</span>
                  ) : null}
                </span>
                {s.goesLiveAt ? (
                  <time
                    dateTime={s.goesLiveAt}
                    className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground sm:text-sm"
                  >
                    Opens {format(new Date(s.goesLiveAt), "EEE d MMM yyyy HH:mm")}
                  </time>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
