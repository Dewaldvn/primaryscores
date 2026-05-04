"use server";

import { requireRole } from "@/lib/auth";
import {
  approveSubmissionInDb,
  bulkApproveSubmissionsWithStoredTeamIds,
  bulkRejectSubmissionsInDb,
  flagSubmissionNeedsReviewInDb,
  rejectSubmissionInDb,
} from "@/lib/backend/moderation-service";
import {
  moderationApproveSchema,
  moderationBulkApproveSchema,
  moderationBulkRejectSchema,
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

export async function bulkRejectSubmissionsAction(input: unknown) {
  const { profile } = await requireRole(["MODERATOR", "ADMIN"]);
  const parsed = moderationBulkRejectSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  await bulkRejectSubmissionsInDb({ profileId: profile.id }, parsed.data.submissionIds, parsed.data.reason);
  return { ok: true as const };
}

export async function bulkApproveSubmissionsAction(input: unknown) {
  const { profile } = await requireRole(["MODERATOR", "ADMIN"]);
  const parsed = moderationBulkApproveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const result = await bulkApproveSubmissionsWithStoredTeamIds(
    { profileId: profile.id },
    parsed.data.submissionIds,
    parsed.data.verificationLevel
  );
  return { ok: true as const, ...result };
}
