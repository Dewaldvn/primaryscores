"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { profileTeamLinks, profiles, teams } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";

const linkSchema = z.object({
  teamId: z.string().uuid(),
  email: z.string().email(),
});

const unlinkSchema = z.object({
  teamId: z.string().uuid(),
  profileId: z.string().uuid(),
});

export async function schoolAdminLinkProfileToTeamAction(input: unknown) {
  const { profile } = await requireRole(["SCHOOL_ADMIN"]);
  const parsed = linkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid team or email." };
  }
  const { teamId, email } = parsed.data;

  const managed = await getActiveManagedSchoolIds(profile.id);
  const [team] = await db
    .select({ schoolId: teams.schoolId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team || !managed.includes(team.schoolId)) {
    return { ok: false as const, error: "You can only link users to teams at your linked school(s)." };
  }

  const normalizedEmail = email.trim();
  const [target] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(sql`lower(${profiles.email}) = lower(${normalizedEmail})`)
    .limit(1);
  if (!target) {
    return {
      ok: false as const,
      error: "No account found with that email. The person must register first.",
    };
  }

  if (target.id === profile.id) {
    return { ok: false as const, error: "You are already the school admin; link other users instead." };
  }

  try {
    await db.insert(profileTeamLinks).values({
      profileId: target.id,
      teamId,
      createdByProfileId: profile.id,
    });
  } catch {
    return { ok: false as const, error: "That user is already linked to this team." };
  }

  revalidatePath(`/school-admin/teams/${teamId}`);
  return { ok: true as const };
}

export async function schoolAdminUnlinkProfileFromTeamAction(input: unknown) {
  const { profile } = await requireRole(["SCHOOL_ADMIN"]);
  const parsed = unlinkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid request." };
  }
  const { teamId, profileId } = parsed.data;

  const managed = await getActiveManagedSchoolIds(profile.id);
  const [team] = await db
    .select({ schoolId: teams.schoolId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!team || !managed.includes(team.schoolId)) {
    return { ok: false as const, error: "You can only manage teams at your linked school(s)." };
  }

  await db
    .delete(profileTeamLinks)
    .where(and(eq(profileTeamLinks.teamId, teamId), eq(profileTeamLinks.profileId, profileId)));

  revalidatePath(`/school-admin/teams/${teamId}`);
  return { ok: true as const };
}
