import { and, eq, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { submissions } from "@/db/schema";
import type { z } from "zod";
import { submitScoreSchema } from "@/lib/validators/submission";

export type SubmitScoreParsed = z.infer<typeof submitScoreSchema>;

export async function createContributorSubmission(
  submittedByUserId: string,
  parsed: SubmitScoreParsed
): Promise<{ submissionId: string; duplicateWarning: boolean }> {
  const normalizedHome = parsed.proposedHomeTeamName.trim().toLowerCase();
  const normalizedAway = parsed.proposedAwayTeamName.trim().toLowerCase();

  const [similar] = await db
    .select({ id: submissions.id })
    .from(submissions)
    .where(
      and(
        eq(submissions.proposedMatchDate, parsed.proposedMatchDate),
        eq(submissions.proposedHomeScore, parsed.proposedHomeScore),
        eq(submissions.proposedAwayScore, parsed.proposedAwayScore),
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
      proposedHomeTeamId: parsed.proposedHomeTeamId ?? null,
      proposedAwayTeamId: parsed.proposedAwayTeamId ?? null,
      proposedHomeTeamName: parsed.proposedHomeTeamName.trim(),
      proposedAwayTeamName: parsed.proposedAwayTeamName.trim(),
      proposedMatchDate: parsed.proposedMatchDate,
      proposedHomeScore: parsed.proposedHomeScore,
      proposedAwayScore: parsed.proposedAwayScore,
      proposedVenue: parsed.proposedVenue?.trim() || null,
      proposedCompetitionId: parsed.proposedCompetitionId ?? null,
      proposedSeasonId: parsed.proposedSeasonId ?? null,
      proposedProvinceId: parsed.proposedProvinceId ?? null,
      submittedByUserId,
      sourceUrl: parsed.sourceUrl ?? null,
      recordingUrl: parsed.recordingUrl ?? null,
      notes: parsed.notes ?? null,
      moderationStatus: "PENDING",
    })
    .returning({ id: submissions.id });

  return {
    submissionId: inserted.id,
    duplicateWarning: Boolean(similar),
  };
}
