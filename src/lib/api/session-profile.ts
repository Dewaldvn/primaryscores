import { eq } from "drizzle-orm";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import type { ProfileRole } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

export type SessionProfileRow = typeof profiles.$inferSelect;

export type ApiAuthResult =
  | { ok: true; user: User; profile: SessionProfileRow }
  | { ok: false; status: 401 | 403; error: string };

/** Session + profile for Route Handlers (JSON errors, no redirect). */
export async function getSessionProfileForApi(): Promise<ApiAuthResult> {
  const supabase = createClient();
  let user: User | null = null;
  try {
    const {
      data: { user: fetched },
    } = await supabase.auth.getUser();
    user = fetched;
  } catch {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  if (!user) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }

  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1);
  if (!profile) {
    return { ok: false, status: 403, error: "Profile not found. Complete signup or contact an admin." };
  }

  return { ok: true, user, profile };
}

export function requireProfileRoles(
  profile: SessionProfileRow,
  allowed: ProfileRole[]
): { ok: true } | { ok: false; status: 403; error: string } {
  if (!allowed.includes(profile.role)) {
    return { ok: false, status: 403, error: "Insufficient permissions" };
  }
  return { ok: true };
}
