import type { User } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";

export type ProfileOnboarding = "PENDING" | "COMPLETED";

/**
 * Load onboarding status, ensuring a `profiles` row exists (see `handle_new_user` in DB; this is
 * a fallback if the trigger was missing or failed). One `SELECT` for most returning logins; new
 * rows need insert + re-read in case of races.
 */
export async function ensureProfileAndGetOnboardingStatus(user: User): Promise<ProfileOnboarding> {
  const [existing] = await db
    .select({ onboardingStatus: profiles.onboardingStatus })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  if (existing) return existing.onboardingStatus;

  const email = user.email?.trim() || "";
  const meta = user.user_metadata ?? {};
  const displayName =
    (typeof meta.full_name === "string" && meta.full_name.trim()) ||
    (typeof meta.name === "string" && meta.name.trim()) ||
    (email ? email.split("@")[0] : "Contributor");

  await db
    .insert(profiles)
    .values({
      id: user.id,
      email: email || "unknown@user",
      displayName: displayName || "Contributor",
      role: "CONTRIBUTOR",
      onboardingStatus: "PENDING",
    })
    .onConflictDoNothing({ target: profiles.id });

  const [after] = await db
    .select({ onboardingStatus: profiles.onboardingStatus })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);
  return after?.onboardingStatus ?? "PENDING";
}

/**
 * Ensures a `profiles` row exists for the signed-in user. Supabase normally creates this via
 * `handle_new_user`, but if that trigger was missing or failed, submissions would FK-fail.
 */
export async function ensureContributorProfile(user: User): Promise<void> {
  await ensureProfileAndGetOnboardingStatus(user);
}
