import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import type { ProfileRole } from "@/lib/auth";

export async function updateUserRoleInDb(userId: string, role: ProfileRole): Promise<void> {
  await db
    .update(profiles)
    .set({ role, updatedAt: new Date() })
    .where(eq(profiles.id, userId));
}
