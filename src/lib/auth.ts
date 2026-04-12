import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { withTimeout } from "@/lib/with-timeout";

const AUTH_GET_USER_MS = 8_000;
const PROFILE_DB_MS = 8_000;
const PROFILE_TOTAL_MS = 15_000;

export type ProfileRole =
  | "PUBLIC"
  | "CONTRIBUTOR"
  | "MODERATOR"
  | "ADMIN"
  | "SCHOOL_ADMIN";

export async function getSessionUser() {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await withTimeout(supabase.auth.getUser(), AUTH_GET_USER_MS);
    return user;
  } catch {
    return null;
  }
}

export async function getProfile() {
  try {
    return await withTimeout(
      (async () => {
        const user = await getSessionUser();
        if (!user || !isDatabaseConfigured()) return null;
        const rows = await db
          .select()
          .from(profiles)
          .where(eq(profiles.id, user.id))
          .limit(1);
        return rows[0] ?? null;
      })(),
      PROFILE_TOTAL_MS
    );
  } catch {
    return null;
  }
}

export async function requireUser(redirectPath = "/login") {
  const user = await getSessionUser();
  if (!user) {
    const sep = redirectPath.includes("?") ? "&" : "?";
    redirect(`${redirectPath}${sep}reason=auth`);
  }
  return user;
}

export async function requireRole(allowed: ProfileRole[], redirectTo = "/") {
  const user = await requireUser();
  let profile;
  try {
    const rows = await withTimeout(
      db.select().from(profiles).where(eq(profiles.id, user.id)).limit(1),
      PROFILE_DB_MS
    );
    profile = rows[0];
  } catch {
    redirect(redirectTo);
  }

  if (!profile || !allowed.includes(profile.role)) {
    redirect(redirectTo);
  }

  return { user, profile };
}
