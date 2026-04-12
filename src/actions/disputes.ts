"use server";

import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";
import { db } from "@/lib/db";
import { fixtures, results, schools, submissions, teams } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { ensureContributorProfile } from "@/lib/auth/ensure-profile";
import { verifyTurnstileToken } from "@/lib/turnstile";

const disputeSchema = z.object({
  fixtureId: z.string().uuid(),
  resultId: z.string().uuid(),
  proposedHomeScore: z.coerce.number().int().min(0).max(500),
  proposedAwayScore: z.coerce.number().int().min(0).max(500),
  message: z.string().trim().min(10, "Please add a short explanation (min 10 characters)."),
  turnstileToken: z.string().nullable().optional(),
});

export async function submitDisputeAction(input: unknown) {
  const user = await requireUser();
  const parsed = disputeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const turnOk = await verifyTurnstileToken(parsed.data.turnstileToken);
  if (!turnOk) {
    return { ok: false as const, error: "Could not verify submission (Turnstile)." };
  }

  await ensureContributorProfile(user);

  // Load the existing fixture + result context so the dispute becomes a normal submission
  // tied to the same fixture, with teams prefilled.
  const homeTeam = alias(teams, "dispute_home_team");
  const awayTeam = alias(teams, "dispute_away_team");
  const homeSchool = alias(schools, "dispute_home_school");
  const awaySchool = alias(schools, "dispute_away_school");

  const [row] = await db
    .select({
      fixtureId: fixtures.id,
      resultId: results.id,
      matchDate: fixtures.matchDate,
      venue: fixtures.venue,
      seasonId: fixtures.seasonId,
      competitionId: fixtures.competitionId,
      homeTeamId: fixtures.homeTeamId,
      awayTeamId: fixtures.awayTeamId,
      homeName: homeSchool.displayName,
      awayName: awaySchool.displayName,
      homeProvinceId: homeSchool.provinceId,
      awayProvinceId: awaySchool.provinceId,
      currentHomeScore: results.homeScore,
      currentAwayScore: results.awayScore,
    })
    .from(fixtures)
    .innerJoin(results, eq(results.fixtureId, fixtures.id))
    .innerJoin(homeTeam, eq(fixtures.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(fixtures.awayTeamId, awayTeam.id))
    .innerJoin(homeSchool, eq(homeTeam.schoolId, homeSchool.id))
    .innerJoin(awaySchool, eq(awayTeam.schoolId, awaySchool.id))
    .where(and(eq(fixtures.id, parsed.data.fixtureId), eq(results.id, parsed.data.resultId)))
    .limit(1);

  if (!row) {
    return { ok: false as const, error: "Could not find that match/result." };
  }

  const now = new Date();
  const notes = [
    `DISPUTE: result=${row.resultId} fixture=${row.fixtureId}`,
    `Current score: ${row.currentHomeScore}-${row.currentAwayScore}`,
    `Claimed score: ${parsed.data.proposedHomeScore}-${parsed.data.proposedAwayScore}`,
    "",
    parsed.data.message.trim(),
  ].join("\n");

  const [ins] = await db
    .insert(submissions)
    .values({
      fixtureId: row.fixtureId,
      proposedHomeTeamId: row.homeTeamId,
      proposedAwayTeamId: row.awayTeamId,
      proposedHomeTeamName: row.homeName,
      proposedAwayTeamName: row.awayName,
      proposedMatchDate: row.matchDate,
      proposedHomeScore: parsed.data.proposedHomeScore,
      proposedAwayScore: parsed.data.proposedAwayScore,
      proposedVenue: row.venue ?? null,
      proposedCompetitionId: row.competitionId ?? null,
      proposedSeasonId: row.seasonId ?? null,
      // Best effort: province from home school (often aligns with competition province, but not always).
      proposedProvinceId: row.homeProvinceId ?? row.awayProvinceId ?? null,
      submittedByUserId: user.id,
      sourceUrl: null,
      recordingUrl: null,
      notes,
      moderationStatus: "NEEDS_REVIEW",
      submittedAt: now,
    })
    .returning({ id: submissions.id });

  return { ok: true as const, submissionId: ins.id };
}

