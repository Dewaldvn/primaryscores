"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fixtures, results } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { adminResultUpdateSchema } from "@/lib/validators/admin";

export async function adminUpdateResultAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = adminResultUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const d = parsed.data;

  const [existing] = await db
    .select({
      id: results.id,
      fixtureId: results.fixtureId,
      publishedAt: results.publishedAt,
    })
    .from(results)
    .where(eq(results.id, d.resultId))
    .limit(1);

  if (!existing) {
    return { ok: false as const, error: "Result not found." };
  }

  const now = new Date();
  const publishedAt = d.isVerified ? (existing.publishedAt ?? now) : null;
  let verificationLevel = d.isVerified ? d.verificationLevel : "SUBMITTED";
  if (d.isVerified && verificationLevel === "SUBMITTED") {
    verificationLevel = "MODERATOR_VERIFIED";
  }

  await db.transaction(async (tx) => {
    await tx
      .update(fixtures)
      .set({
        matchDate: d.matchDate,
        venue: d.venue?.trim() || null,
        recordingUrl: d.recordingUrl,
        updatedAt: now,
      })
      .where(eq(fixtures.id, existing.fixtureId));

    await tx
      .update(results)
      .set({
        homeScore: d.homeScore,
        awayScore: d.awayScore,
        isVerified: d.isVerified,
        verificationLevel,
        publishedAt,
        updatedAt: now,
      })
      .where(eq(results.id, d.resultId));
  });

  return { ok: true as const };
}
