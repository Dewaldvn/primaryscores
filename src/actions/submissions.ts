"use server";

import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { submitScoreSchema } from "@/lib/validators/submission";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function submitScoreAction(input: unknown) {
  const user = await requireUser();
  const parsed = submitScoreSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const turnOk = await verifyTurnstileToken(parsed.data.turnstileToken);
  if (!turnOk) {
    return { ok: false as const, error: "Could not verify submission (Turnstile)." };
  }

  const normalizedHome = parsed.data.proposedHomeTeamName.trim().toLowerCase();
  const normalizedAway = parsed.data.proposedAwayTeamName.trim().toLowerCase();

  const [similar] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.proposedMatchDate, parsed.data.proposedMatchDate),
        eq(submissions.proposedHomeScore, parsed.data.proposedHomeScore),
        eq(submissions.proposedAwayScore, parsed.data.proposedAwayScore),
        or(
          eq(submissions.moderationStatus, "PENDING"),
          eq(submissions.moderationStatus, "NEEDS_REVIEW")
        )!,
        sql`lower(${submissions.proposedHomeTeamName}) = ${normalizedHome}`,
        sql`lower(${submissions.proposedAwayTeamName}) = ${normalizedAway}`
      )
    )
    .limit(1);

  const [inserted] = await db
    .insert(submissions)
    .values({
      proposedHomeTeamId: parsed.data.proposedHomeTeamId ?? null,
      proposedAwayTeamId: parsed.data.proposedAwayTeamId ?? null,
      proposedHomeTeamName: parsed.data.proposedHomeTeamName.trim(),
      proposedAwayTeamName: parsed.data.proposedAwayTeamName.trim(),
      proposedMatchDate: parsed.data.proposedMatchDate,
      proposedHomeScore: parsed.data.proposedHomeScore,
      proposedAwayScore: parsed.data.proposedAwayScore,
      proposedVenue: parsed.data.proposedVenue?.trim() || null,
      proposedCompetitionId: parsed.data.proposedCompetitionId ?? null,
      proposedSeasonId: parsed.data.proposedSeasonId ?? null,
      proposedProvinceId: parsed.data.proposedProvinceId ?? null,
      submittedByUserId: user.id,
      sourceUrl: parsed.data.sourceUrl ?? null,
      notes: parsed.data.notes ?? null,
      moderationStatus: "PENDING",
    })
    .returning({ id: submissions.id });

  return {
    ok: true as const,
    submissionId: inserted.id,
    duplicateWarning: Boolean(similar),
  };
}
