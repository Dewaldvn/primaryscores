"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { schoolAdminMemberships } from "@/db/schema";
import { requireRole } from "@/lib/auth";

const schoolIdSchema = z.object({
  schoolId: z.string().uuid(),
});

const membershipIdSchema = z.object({
  membershipId: z.string().uuid(),
});

export async function requestSchoolAdminMembershipAction(input: unknown) {
  const { profile } = await requireRole(["SCHOOL_ADMIN"]);
  const parsed = schoolIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { schoolId } = parsed.data;

  const [dup] = await db
    .select({ id: schoolAdminMemberships.id })
    .from(schoolAdminMemberships)
    .where(
      and(
        eq(schoolAdminMemberships.profileId, profile.id),
        eq(schoolAdminMemberships.schoolId, schoolId),
        ne(schoolAdminMemberships.status, "REVOKED"),
      ),
    )
    .limit(1);

  if (dup) {
    return {
      ok: false as const,
      error: "You already have a pending or active link for this school.",
    };
  }

  await db.insert(schoolAdminMemberships).values({
    profileId: profile.id,
    schoolId,
    status: "PENDING",
  });

  revalidatePath("/school-admin");
  revalidatePath("/moderator");
  return { ok: true as const };
}

export async function cancelSchoolAdminMembershipFormAction(formData: FormData) {
  const raw = formData.get("membershipId");
  const res = await cancelSchoolAdminMembershipRequestAction({
    membershipId: typeof raw === "string" ? raw : "",
  });
  if (res.ok) redirect("/school-admin");
}

export async function cancelSchoolAdminMembershipRequestAction(input: unknown) {
  const { profile } = await requireRole(["SCHOOL_ADMIN"]);
  const parsed = membershipIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [row] = await db
    .select({ id: schoolAdminMemberships.id })
    .from(schoolAdminMemberships)
    .where(
      and(
        eq(schoolAdminMemberships.id, parsed.data.membershipId),
        eq(schoolAdminMemberships.profileId, profile.id),
        eq(schoolAdminMemberships.status, "PENDING"),
      ),
    )
    .limit(1);

  if (!row) {
    return { ok: false as const, error: "Request not found or already processed." };
  }

  await db.delete(schoolAdminMemberships).where(eq(schoolAdminMemberships.id, row.id));
  revalidatePath("/school-admin");
  revalidatePath("/moderator");
  return { ok: true as const };
}

export async function approveSchoolAdminMembershipAction(input: unknown) {
  const { profile } = await requireRole(["MODERATOR", "ADMIN"]);
  const parsed = membershipIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const now = new Date();
  const updated = await db
    .update(schoolAdminMemberships)
    .set({
      status: "ACTIVE",
      decidedAt: now,
      decidedByProfileId: profile.id,
    })
    .where(
      and(
        eq(schoolAdminMemberships.id, parsed.data.membershipId),
        eq(schoolAdminMemberships.status, "PENDING"),
      ),
    )
    .returning({ id: schoolAdminMemberships.id });

  if (updated.length === 0) {
    return { ok: false as const, error: "Request not found or already processed." };
  }
  revalidatePath("/school-admin");
  revalidatePath("/moderator");
  return { ok: true as const };
}

export async function rejectSchoolAdminMembershipAction(input: unknown) {
  const { profile } = await requireRole(["MODERATOR", "ADMIN"]);
  const parsed = membershipIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const now = new Date();
  const updated = await db
    .update(schoolAdminMemberships)
    .set({
      status: "REVOKED",
      decidedAt: now,
      decidedByProfileId: profile.id,
    })
    .where(
      and(
        eq(schoolAdminMemberships.id, parsed.data.membershipId),
        eq(schoolAdminMemberships.status, "PENDING"),
      ),
    )
    .returning({ id: schoolAdminMemberships.id });

  if (updated.length === 0) {
    return { ok: false as const, error: "Request not found or already processed." };
  }
  revalidatePath("/school-admin");
  revalidatePath("/moderator");
  return { ok: true as const };
}
