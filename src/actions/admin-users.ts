"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import type { ProfileRole } from "@/lib/auth";

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["PUBLIC", "CONTRIBUTOR", "MODERATOR", "ADMIN"]),
});

export async function updateUserRoleAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { userId, role } = parsed.data;

  await db
    .update(profiles)
    .set({ role: role as ProfileRole, updatedAt: new Date() })
    .where(eq(profiles.id, userId));

  return { ok: true as const };
}
