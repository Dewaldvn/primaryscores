/** JSON shape returned by `/api/live-sessions` and `/api/live-sessions/[id]`. */

export type LiveSessionMajority = { homeScore: number; awayScore: number; voterCount: number } | null;

export type LiveSessionClientRow = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoPath: string | null;
  awayLogoPath: string | null;
  venue: string | null;
  status: string;
  firstVoteAt: string | null;
  majority: LiveSessionMajority;
  minutesSinceFirstVote: number | null;
  inWrapup: boolean;
  autoSubmitAfterMinutes: number;
  /** From `live_session_presence` heartbeats on the live game page. */
  activeViewerCount?: number;
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
