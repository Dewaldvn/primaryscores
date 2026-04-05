"use server";

import { requireRole } from "@/lib/auth";
import {
  approveSubmissionInDb,
  flagSubmissionNeedsReviewInDb,
  rejectSubmissionInDb,
} from "@/lib/backend/moderation-service";
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

  const result = await approveSubmissionInDb({ profileId: profile.id }, parsed.data);
  if (!result.ok) {
    return { ok: false as const, error: result.error };
  }
  return { ok: true as const, fixtureId: result.fixtureId };
}

export async function rejectSubmissionAction(input: unknown) {
  const { profile } = await requireRole(["MODERATOR", "ADMIN"]);
  const parsed = moderationRejectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  await rejectSubmissionInDb({ profileId: profile.id }, parsed.data);
  return { ok: true as const };
}

export async function flagNeedsReviewAction(submissionId: string) {
  const { profile } = await requireRole(["MODERATOR", "ADMIN"]);
  await flagSubmissionNeedsReviewInDb({ profileId: profile.id }, submissionId);
  return { ok: true as const };
}
