import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { schools, teams } from "@/db/schema";
import { findOpenLiveSessionDuplicate, insertLiveSessionRow } from "@/lib/data/live-sessions";
import type { SchoolSport } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";
import { sameAgeGroupBand } from "@/lib/age-group-match";

export const liveScheduleInputSchema = z
  .object({
    homeTeamId: z.string().uuid(),
    awayTeamId: z.string().uuid(),
    seasonId: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable().optional()),
    competitionId: z.preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable().optional()),
    venue: z.string().max(300).optional().nullable(),
    goesLiveAtIso: z.string().min(8),
  })
  .superRefine((data, ctx) => {
    if (data.seasonId && data.competitionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a season or a competition, not both.",
        path: ["competitionId"],
      });
    }
  });

export function teamLiveLabel(
  schoolDisplay: string,
  row: { sport: string; ageGroup: string; teamLabel: string }
): string {
  return `${schoolDisplay} · ${row.sport} ${row.ageGroup} ${row.teamLabel}`.slice(0, 200);
}

export type LiveScheduleResult =
  | { ok: true; sessionId: string; scheduled: boolean }
  | { ok: false; error: string }
  | { ok: false; fieldErrors: Record<string, string[] | undefined> };

/**
 * Shared schedule logic. `homeSchoolIdsAllowlist`:
 * - `null` → any active home team (site admin).
 * - non-empty array → home team’s school must be listed (school admin).
 */
export async function runLiveSessionSchedule(
  parsed: z.infer<typeof liveScheduleInputSchema>,
  createdByUserId: string,
  homeSchoolIdsAllowlist: string[] | null
): Promise<LiveScheduleResult> {
  const [homeRow] = await db
    .select({
      team: teams,
      schoolId: schools.id,
      schoolName: schools.displayName,
      schoolLogo: schools.logoPath,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .where(eq(teams.id, parsed.homeTeamId))
    .limit(1);

  const [awayRow] = await db
    .select({
      team: teams,
      schoolId: schools.id,
      schoolName: schools.displayName,
      schoolLogo: schools.logoPath,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .where(eq(teams.id, parsed.awayTeamId))
    .limit(1);

  if (!homeRow || !awayRow || !homeRow.team.active || !awayRow.team.active) {
    return { ok: false, error: "Invalid teams." };
  }
  if (homeSchoolIdsAllowlist && !homeSchoolIdsAllowlist.includes(homeRow.schoolId)) {
    return { ok: false, error: "Home team must be from your linked school." };
  }
  if (homeRow.team.id === awayRow.team.id) {
    return { ok: false, error: "Choose two different teams." };
  }

  const sport = homeRow.team.sport as SchoolSport;
  if (awayRow.team.sport !== sport) {
    return { ok: false, error: "Both teams must be the same sport." };
  }
  if (!sameAgeGroupBand(awayRow.team.ageGroup, homeRow.team.ageGroup)) {
    return { ok: false, error: "Both teams must be in the same age group (e.g. U13 vs U13)." };
  }

  const homeName = teamLiveLabel(homeRow.schoolName, homeRow.team);
  const awayName = teamLiveLabel(awayRow.schoolName, awayRow.team);

  const teamGender = sport === "HOCKEY" ? (homeRow.team.gender as TeamGender | null) : null;
  if (sport === "HOCKEY" && teamGender == null) {
    return { ok: false, error: "Hockey team is missing gender." };
  }
  if (sport === "HOCKEY" && awayRow.team.gender !== teamGender) {
    return { ok: false, error: "Opponent must be the same hockey side (boys or girls)." };
  }

  const goesLive = new Date(parsed.goesLiveAtIso);
  if (Number.isNaN(goesLive.getTime())) {
    return { ok: false, error: "Invalid date/time." };
  }

  const now = new Date();
  const IMMEDIATE_MS = 120_000;
  const isFuture = goesLive.getTime() > now.getTime() + IMMEDIATE_MS;

  const dup = await findOpenLiveSessionDuplicate(homeName, awayName, sport, teamGender);
  if (dup) {
    return {
      ok: false,
      error: "A scoreboard for this fixture is already scheduled or live.",
    };
  }

  const row = await insertLiveSessionRow({
    sport,
    teamGender: sport === "HOCKEY" ? teamGender : null,
    homeTeamName: homeName,
    awayTeamName: awayName,
    homeLogoPath: homeRow.schoolLogo?.trim() || null,
    awayLogoPath: awayRow.schoolLogo?.trim() || null,
    venue: parsed.venue?.trim() || null,
    seasonId: parsed.seasonId ?? null,
    competitionId: parsed.competitionId ?? null,
    createdByUserId,
    status: isFuture ? "SCHEDULED" : "ACTIVE",
    goesLiveAt: isFuture ? goesLive : null,
  });

  return { ok: true, sessionId: row.id, scheduled: isFuture };
}
