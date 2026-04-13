/** JSON shape returned by `/api/live-sessions` and `/api/live-sessions/[id]`. */

import type { SchoolSport } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";

export type LiveSessionMajority = { homeScore: number; awayScore: number; voterCount: number } | null;

export type LiveSessionClientRow = {
  id: string;
  sport: SchoolSport;
  teamGender: TeamGender | null;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoPath: string | null;
  awayLogoPath: string | null;
  venue: string | null;
  status: string;
  /** When the board opened for scoring (immediate start or scheduled go-live). */
  scoringOpenedAt: string | null;
  firstVoteAt: string | null;
  majority: LiveSessionMajority;
  /** Minutes since first submitted score (display only). */
  minutesSinceFirstVote: number | null;
  /** Minutes since scoring opened — used for wrap-up / auto-submit countdown. */
  minutesSinceScoringOpened: number | null;
  inWrapup: boolean;
  autoSubmitAfterMinutes: number;
  /** Present when status is SCHEDULED — when voting opens (ISO). */
  goesLiveAt?: string | null;
  /** Session creator (for cancel own scheduled board). */
  createdByUserId?: string | null;
  /** True when signed-in user may cancel this scheduled board. */
  canCancelScheduled?: boolean;
};

export type LiveScoreFeedItem = {
  id: string;
  at: string;
  homeScore: number;
  awayScore: number;
  displayName: string;
  avatarUrl: string | null;
};

export type LiveSessionViewer = {
  displayName: string;
  avatarUrl: string | null;
};
