"use server";

import { requireUser } from "@/lib/auth";
import { ensureContributorProfile } from "@/lib/auth/ensure-profile";
import { createContributorSubmission } from "@/lib/backend/contributor-submissions";
import { submitScoreSchema } from "@/lib/validators/submission";
import { verifyTurnstileToken } from "@/lib/turnstile";

/** Inserts a row into `submissions` (pending moderation). */
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

  await ensureContributorProfile(user);

  const { submissionId, duplicateWarning } = await createContributorSubmission(user.id, parsed.data);

  return {
    ok: true as const,
    submissionId,
    duplicateWarning,
  };
}
