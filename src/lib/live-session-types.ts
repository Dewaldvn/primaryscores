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
  firstVoteAt: string | null;
  majority: LiveSessionMajority;
  minutesSinceFirstVote: number | null;
  inWrapup: boolean;
  autoSubmitAfterMinutes: number;
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
