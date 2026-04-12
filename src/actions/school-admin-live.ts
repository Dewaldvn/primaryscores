"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { liveSessions, schools, teams } from "@/db/schema";
import {
  deleteLiveSessionById,
  findOpenLiveSessionDuplicate,
  insertLiveSessionRow,
} from "@/lib/data/live-sessions";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import type { SchoolSport } from "@/lib/sports";
import { adminLiveSessionIdSchema } from "@/lib/validators/live";

const scheduleSchema = z.object({
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  venue: z.string().max(300).optional().nullable(),
  goesLiveAtIso: z.string().min(8),
});

function teamLiveLabel(
  schoolDisplay: string,
  row: { sport: string; ageGroup: string; teamLabel: string },
): string {
  return `${schoolDisplay} · ${row.sport} ${row.ageGroup} ${row.teamLabel}`.slice(0, 200);
}

export async function schoolAdminScheduleLiveSessionAction(input: unknown) {
  const { profile } = await requireRole(["SCHOOL_ADMIN"]);
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const managed = await getActiveManagedSchoolIds(profile.id);
  if (managed.length === 0) {
    return { ok: false as const, error: "You need an approved school link first." };
  }

  const [homeRow] = await db
    .select({
      team: teams,
      schoolId: schools.id,
      schoolName: schools.displayName,
      schoolLogo: schools.logoPath,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .where(eq(teams.id, parsed.data.homeTeamId))
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
    .where(eq(teams.id, parsed.data.awayTeamId))
    .limit(1);

  if (!homeRow || !awayRow || !homeRow.team.active || !awayRow.team.active) {
    return { ok: false as const, error: "Invalid teams." };
  }
  if (!managed.includes(homeRow.schoolId)) {
    return { ok: false as const, error: "Home team must be from your linked school." };
  }
  if (homeRow.team.id === awayRow.team.id) {
    return { ok: false as const, error: "Choose two different teams." };
  }

  const sport = homeRow.team.sport as SchoolSport;
  if (awayRow.team.sport !== sport) {
    return { ok: false as const, error: "Both teams must be the same sport." };
  }

  const homeName = teamLiveLabel(homeRow.schoolName, homeRow.team);
  const awayName = teamLiveLabel(awayRow.schoolName, awayRow.team);

  const teamGender = sport === "HOCKEY" ? homeRow.team.gender : null;
  if (sport === "HOCKEY" && teamGender == null) {
    return { ok: false as const, error: "Hockey team is missing gender." };
  }
  if (sport === "HOCKEY" && awayRow.team.gender !== teamGender) {
    return { ok: false as const, error: "Opponent must be the same hockey side (boys or girls)." };
  }

  const goesLive = new Date(parsed.data.goesLiveAtIso);
  if (Number.isNaN(goesLive.getTime())) {
    return { ok: false as const, error: "Invalid date/time." };
  }

  const now = new Date();
  const IMMEDIATE_MS = 120_000;
  const isFuture = goesLive.getTime() > now.getTime() + IMMEDIATE_MS;

  const dup = await findOpenLiveSessionDuplicate(homeName, awayName, sport, teamGender);
  if (dup) {
    return {
      ok: false as const,
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
    venue: parsed.data.venue?.trim() || null,
    createdByUserId: profile.id,
    status: isFuture ? "SCHEDULED" : "ACTIVE",
    goesLiveAt: isFuture ? goesLive : null,
  });

  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/school-admin/schedule-live");
  return { ok: true as const, sessionId: row.id, scheduled: isFuture };
}

export async function schoolAdminCancelScheduledLiveSessionAction(input: unknown) {
  const { profile } = await requireRole(["SCHOOL_ADMIN"]);
  const parsed = adminLiveSessionIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid session." };
  }

  const sessionId = parsed.data.sessionId;
  const [ls] = await db
    .select({
      id: liveSessions.id,
      status: liveSessions.status,
      createdByUserId: liveSessions.createdByUserId,
    })
    .from(liveSessions)
    .where(and(eq(liveSessions.id, sessionId), eq(liveSessions.status, "SCHEDULED")))
    .limit(1);

  if (!ls || ls.createdByUserId !== profile.id) {
    return { ok: false as const, error: "You can only cancel your own scheduled games." };
  }

  const res = await deleteLiveSessionById(sessionId);
  if (!res.ok) {
    return { ok: false as const, error: res.error };
  }
  revalidatePath("/");
  revalidatePath("/live");
  revalidatePath("/school-admin/schedule-live");
  return { ok: true as const };
}
