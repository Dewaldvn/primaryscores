import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import { SchoolLogo } from "@/components/school-logo";
import { ScoreCardSportIcons } from "@/components/score-card-sport-icons";
import type { LiveSessionPublic } from "@/lib/data/live-sessions";
import { schoolSportLabel, type SchoolSport } from "@/lib/sports";
import { cn } from "@/lib/utils";
import { SCORE_RESULT_FRAME_CLASS } from "@/lib/score-result-frame";

export function HomeLiveScoresPeek({
  sessions,
  loadError,
  sportFilter,
}: {
  sessions: LiveSessionPublic[];
  loadError: string | null;
  /** When set, links and copy are scoped to this sport; per-row sport labels are hidden. */
  sportFilter?: SchoolSport;
}) {
  const liveHref = sportFilter ? `/live?sport=${sportFilter}` : "/live";
  return (
    <div className={cn(SCORE_RESULT_FRAME_CLASS, "rounded-lg bg-muted/15 px-3 py-3 sm:px-4")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">
          {sportFilter ? `${schoolSportLabel(sportFilter)} live scores` : "Live scores"}
        </h2>
        <LinkButton href={liveHref} variant="outline" size="sm">
          Open live scoring
        </LinkButton>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {sportFilter
          ? `Up to five open ${schoolSportLabel(sportFilter)} games (crowd-sourced votes).`
          : "Up to five games underway right now (crowd-sourced votes)."}
      </p>
      {loadError ? (
        <p className="mt-2 text-sm text-destructive">
          Could not load live games.
          {process.env.NODE_ENV === "development" ? (
            <span className="mt-1 block font-mono text-xs">{loadError}</span>
          ) : null}
        </p>
      ) : sessions.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No live games open.{" "}
          <Link href={liveHref} className="text-primary underline-offset-4 hover:underline">
            Start or join one on the live page
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-2 divide-y rounded-md bg-background/80 text-sm">
          {sessions.map((s) => (
            <li key={s.id} className="relative">
              <ScoreCardSportIcons sport={s.sport} teamGender={s.teamGender} className="bottom-2 left-2 z-[2]" />
              <Link
                href={`/live/${s.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 px-3 py-2 pl-10 pb-8 hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1">
                  {!sportFilter ? (
                    <span className="mb-0.5 block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      {schoolSportLabel(s.sport)}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {s.homeLogoPath ? (
                      <SchoolLogo logoPath={s.homeLogoPath} alt="" size="xs" className="shrink-0" />
                    ) : null}
                    <span>{s.homeTeamName}</span>
                  </span>
                  <span className="text-muted-foreground"> vs </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    {s.awayLogoPath ? (
                      <SchoolLogo logoPath={s.awayLogoPath} alt="" size="xs" className="shrink-0" />
                    ) : null}
                    <span>{s.awayTeamName}</span>
                  </span>
                  {s.inWrapup ? (
                    <span className="ml-1.5 text-xs font-normal text-amber-800 dark:text-amber-200">Wrapping up</span>
                  ) : null}
                </span>
                <span className="shrink-0 font-mono text-sm tabular-nums text-muted-foreground">
                  {s.majority ? (
                    <>
                      {s.majority.homeScore}–{s.majority.awayScore}
                    </>
                  ) : (
                    <span className="text-xs">Awaiting votes</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
