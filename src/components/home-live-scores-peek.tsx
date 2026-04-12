import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import type { LiveSessionPublic } from "@/lib/data/live-sessions";

export function HomeLiveScoresPeek({
  sessions,
  loadError,
}: {
  sessions: LiveSessionPublic[];
  loadError: string | null;
}) {
  return (
    <div className="rounded-lg border bg-muted/15 px-3 py-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold">Live scores</h2>
        <LinkButton href="/live" variant="outline" size="sm">
          Open live scoring
        </LinkButton>
      </div>
      <p className="mt-0.5 text-xs text-muted-foreground">Up to five games underway right now (crowd-sourced votes).</p>
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
          <Link href="/live" className="text-primary underline-offset-4 hover:underline">
            Start or join one on the live page
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-2 divide-y rounded-md border bg-background/80 text-sm">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/live/${s.id}`}
                className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1 px-3 py-2 hover:bg-muted/60"
              >
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{s.homeTeamName}</span>
                  <span className="text-muted-foreground"> vs </span>
                  <span className="font-medium">{s.awayTeamName}</span>
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
