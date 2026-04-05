"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  fixtures,
  moderationLogs,
  results,
  submissions,
} from "@/db/schema";
import { requireRole } from "@/lib/auth";
import {
  moderationApproveSchema,
  moderationRejectSchema,
} from "@/lib/validators/submission";

export async function approveSubmissionAction(input: unknown) {
  const { profile } = await requireRole(["MODERATOR", "ADMIN"]);
  const parsed = moderationApproveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  const [existingSub] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, d.submissionId))
    .limit(1);

  if (!existingSub) {
    return { ok: false as const, error: "Submission not found." };
  }

  if (
    existingSub.moderationStatus !== "PENDING" &&
    existingSub.moderationStatus !== "NEEDS_REVIEW"
  ) {
    return { ok: false as const, error: "Submission is already resolved." };
  }

  const now = new Date();

  const fixtureId = await db.transaction(async (tx) => {
    let fid = existingSub.fixtureId;

    if (!fid) {
      const [fx] = await tx
        .insert(fixtures)
        .values({
          seasonId: d.seasonId,
          competitionId: d.competitionId,
          matchDate: d.matchDate,
          homeTeamId: d.homeTeamId,
          awayTeamId: d.awayTeamId,
          venue: d.venue ?? null,
          status: "PLAYED",
        })
        .returning({ id: fixtures.id });
      fid = fx.id;
    } else {
      await tx
        .update(fixtures)
        .set({
          seasonId: d.seasonId,
          competitionId: d.competitionId,
          matchDate: d.matchDate,
          homeTeamId: d.homeTeamId,
          awayTeamId: d.awayTeamId,
          venue: d.venue ?? null,
          status: "PLAYED",
          updatedAt: now,
        })
        .where(eq(fixtures.id, existingSub.fixtureId!));
    }

    const [res] = await tx
      .select({ id: results.id })
      .from(results)
      .where(eq(results.fixtureId, fid))
      .limit(1);

    if (res) {
      await tx
        .update(results)
        .set({
          homeScore: d.homeScore,
          awayScore: d.awayScore,
          isVerified: true,
          verificationLevel: d.verificationLevel,
          publishedAt: now,
          updatedAt: now,
        })
        .where(eq(results.id, res.id));
    } else {
       await tx.insert(results).values({
        fixtureId: fid,
        homeScore: d.homeScore,
        awayScore: d.awayScore,
        isVerified: true,
        verificationLevel: d.verificationLevel,
        publishedAt: now,
      });
    }

    await tx
      .update(submissions)
      .set({
        moderationStatus: "APPROVED",
        reviewedAt: now,
        reviewedByUserId: profile.id,
        fixtureId: fid,
      })
      .where(eq(submissions.id, d.submissionId));

    await tx.insert(moderationLogs).values({
      submissionId: d.submissionId,
      moderatorUserId: profile.id,
      action: "APPROVED",
      reason: null,
    });

    return fid;
  });

  return { ok: true as const, fixtureId };
}

export async function rejectSubmissionAction(input: unknown) {
  const { profile } = await requireRole(["MODERATOR", "ADMIN"]);
  const parsed = moderationRejectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(submissions)
      .set({
        moderationStatus: "REJECTED",
        reviewedAt: now,
        reviewedByUserId: profile.id,
      })
      .where(eq(submissions.id, parsed.data.submissionId));

    await tx.insert(moderationLogs).values({
      submissionId: parsed.data.submissionId,
      moderatorUserId: profile.id,
      action: "REJECTED",
      reason: parsed.data.reason,
    });
  });

  return { ok: true as const };
}

export async function flagNeedsReviewAction(submissionId: string) {
  const { profile } = await requireRole(["MODERATOR", "ADMIN"]);
  await db
    .update(submissions)
    .set({ moderationStatus: "NEEDS_REVIEW" })
    .where(eq(submissions.id, submissionId));

  await db.insert(moderationLogs).values({
    submissionId,
    moderatorUserId: profile.id,
    action: "NEEDS_REVIEW",
    reason: "Flagged for follow-up",
  });

  return { ok: true as const };
}
