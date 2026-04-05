import type { User } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";

/**
 * Ensures a `profiles` row exists for the signed-in user. Supabase normally creates this via
 * `handle_new_user`, but if that trigger was missing or failed, submissions would FK-fail.
 */
export async function ensureContributorProfile(user: User): Promise<void> {
  const [row] = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (row) return;

  const email = user.email?.trim() || "";
  const displayName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    (email ? email.split("@")[0] : "Contributor");

  await db
    .insert(profiles)
    .values({
      id: user.id,
      email: email || "unknown@user",
      displayName: displayName || "Contributor",
      role: "CONTRIBUTOR",
    })
    .onConflictDoNothing({ target: profiles.id });
}
