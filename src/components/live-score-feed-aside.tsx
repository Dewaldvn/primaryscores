"use client";

import { format } from "date-fns";
import { ProfileAvatar } from "@/components/profile-avatar";
import type { LiveScoreFeedItem } from "@/lib/live-session-types";
import { cn } from "@/lib/utils";
import { SCORE_RESULT_FRAME_CLASS } from "@/lib/score-result-frame";

export function LiveScoreFeedAside({ items }: { items: LiveScoreFeedItem[] }) {
  if (items.length === 0) {
    return (
      <aside className={cn(SCORE_RESULT_FRAME_CLASS, "rounded-lg bg-muted/20 p-4 text-center text-xs text-muted-foreground")}>
        No score updates yet. Updates appear here when people submit their view.
      </aside>
    );
  }

  return (
    <aside
      className={cn(
        SCORE_RESULT_FRAME_CLASS,
        "flex max-h-[min(70vh,560px)] flex-col overflow-hidden rounded-lg bg-card shadow-sm"
      )}
    >
      <div className="shrink-0 border-b border-border bg-muted/30 px-3 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score activity</h2>
        <p className="text-[11px] text-muted-foreground">Newest first</p>
      </div>
      <ul className="min-h-0 flex-1 space-y-0 overflow-y-auto">
        {items.map((ev) => (
          <li
            key={ev.id}
            className="flex gap-2 border-b border-border/60 px-3 py-2.5 text-xs last:border-b-0 hover:bg-muted/40"
          >
            <time className="w-14 shrink-0 tabular-nums text-muted-foreground" dateTime={ev.at} title={ev.at}>
              {format(new Date(ev.at), "HH:mm:ss")}
            </time>
            <ProfileAvatar avatarUrl={ev.avatarUrl} displayName={ev.displayName} size="xs" className="mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{ev.displayName}</p>
              <p className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {ev.homeScore} – {ev.awayScore}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
