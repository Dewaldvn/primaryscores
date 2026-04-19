"use client";

import type { LiveSessionClientRow, LiveSessionViewer } from "@/lib/live-session-types";
import type { SchoolSport } from "@/lib/sports";
import {
  LiveSessionTapVoteBoard,
  NETBALL_HOCKEY_SOCCER_SCORE_STEPS,
  RUGBY_SCORE_STEPS,
} from "@/components/live-session-rugby-board";

function scoreStepsForSport(sport: SchoolSport): readonly number[] {
  switch (sport) {
    case "RUGBY":
      return RUGBY_SCORE_STEPS;
    case "NETBALL":
    case "HOCKEY":
    case "SOCCER":
      return NETBALL_HOCKEY_SOCCER_SCORE_STEPS;
    default: {
      const _n: never = sport;
      return _n;
    }
  }
}

export function LiveSessionActiveCard({
  session: s,
  signedIn,
  isAdmin,
  viewer,
  onRefresh,
  onSessionDeleted,
  turnVoteToken,
  onVoteToken,
  turnWrapupToken,
  onWrapupToken,
}: {
  session: LiveSessionClientRow;
  signedIn: boolean;
  isAdmin: boolean;
  viewer: LiveSessionViewer | null;
  onRefresh: () => void;
  onSessionDeleted?: () => void;
  turnVoteToken: string | null;
  onVoteToken: (t: string | null) => void;
  turnWrapupToken: string | null;
  onWrapupToken: (t: string | null) => void;
}) {
  return (
    <LiveSessionTapVoteBoard
      session={s}
      signedIn={signedIn}
      isAdmin={isAdmin}
      viewer={viewer}
      onRefresh={onRefresh}
      onSessionDeleted={onSessionDeleted}
      turnVoteToken={turnVoteToken}
      onVoteToken={onVoteToken}
      turnWrapupToken={turnWrapupToken}
      onWrapupToken={onWrapupToken}
      scoreSteps={scoreStepsForSport(s.sport)}
    />
  );
}
