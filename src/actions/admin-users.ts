"use server";

import { z } from "zod";
import { updateUserRoleInDb } from "@/lib/backend/admin-users-service";
import { requireRole } from "@/lib/auth";
import type { ProfileRole } from "@/lib/auth";

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["PUBLIC", "CONTRIBUTOR", "MODERATOR", "ADMIN", "SCHOOL_ADMIN"]),
});

export async function updateUserRoleAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { userId, role } = parsed.data;

  await updateUserRoleInDb(userId, role as ProfileRole);

  return { ok: true as const };
}
