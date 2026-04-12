"use server";

import { getSessionUser } from "@/lib/auth";
import { ensureContributorProfile } from "@/lib/auth/ensure-profile";
import {
  addFavouriteSchool,
  isSchoolFavourited,
  removeFavouriteSchool,
} from "@/lib/data/favourite-schools";
import { db } from "@/lib/db";
import { schools } from "@/db/schema";
import { eq } from "drizzle-orm";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function toggleFavouriteSchoolAction(schoolId: string) {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "Sign in to favourite a school." };
  }
  if (!UUID_RE.test(schoolId)) {
    return { ok: false as const, error: "Invalid school." };
  }

  await ensureContributorProfile(user);

  const [s] = await db.select({ id: schools.id }).from(schools).where(eq(schools.id, schoolId)).limit(1);
  if (!s) {
    return { ok: false as const, error: "School not found." };
  }

  const favourited = await isSchoolFavourited(user.id, schoolId);
  if (favourited) {
    await removeFavouriteSchool(user.id, schoolId);
    return { ok: true as const, favourited: false as const };
  }
  await addFavouriteSchool(user.id, schoolId);
  return { ok: true as const, favourited: true as const };
}
