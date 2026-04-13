"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";

const updateDisplayNameSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
});

export async function updateProfileDisplayNameAction(input: unknown) {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  const parsed = updateDisplayNameSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  await db
    .update(profiles)
    .set({ displayName: parsed.data.displayName, updatedAt: new Date() })
    .where(eq(profiles.id, user.id));
  return { ok: true as const };
}

export async function completeFirstSignInOnboardingAction() {
  const user = await getSessionUser();
  if (!user) return { ok: false as const, error: "Sign in required." };
  await db
    .update(profiles)
    .set({ onboardingStatus: "COMPLETED", updatedAt: new Date() })
    .where(eq(profiles.id, user.id));
  return { ok: true as const };
}
