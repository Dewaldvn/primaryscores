"use server";

import { inArray } from "drizzle-orm";
import { requireUser } from "@/lib/auth";
import { ensureContributorProfile } from "@/lib/auth/ensure-profile";
import { createContributorSubmission } from "@/lib/backend/contributor-submissions";
import { submitScoreSchema } from "@/lib/validators/submission";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { db } from "@/lib/db";
import { teams } from "@/db/schema";
import { sameAgeGroupBand } from "@/lib/age-group-match";

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

  if (parsed.data.proposedHomeTeamId && parsed.data.proposedAwayTeamId) {
    const rows = await db
      .select({
        id: teams.id,
        ageGroup: teams.ageGroup,
      })
      .from(teams)
      .where(inArray(teams.id, [parsed.data.proposedHomeTeamId, parsed.data.proposedAwayTeamId]));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const home = byId.get(parsed.data.proposedHomeTeamId);
    const away = byId.get(parsed.data.proposedAwayTeamId);
    if (!home || !away) {
      return { ok: false as const, error: "Selected teams could not be found." };
    }
    if (!sameAgeGroupBand(home.ageGroup, away.ageGroup)) {
      return {
        ok: false as const,
        error: "Choose teams in the same age group (e.g. U13 vs U13) when entering a score.",
      };
    }
  }

  const { submissionId, duplicateWarning } = await createContributorSubmission(user.id, parsed.data);

  return {
    ok: true as const,
    submissionId,
    duplicateWarning,
  };
}
