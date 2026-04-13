"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { schoolAdminMemberships, schools } from "@/db/schema";
import { requireRole, requireUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { SCHOOL_ADMIN_CLAIMS_BUCKET } from "@/lib/school-admin-claim-letter";

const schoolIdSchema = z.object({
  schoolId: z.string().uuid(),
});

const membershipIdSchema = z.object({
  membershipId: z.string().uuid(),
});

const MAX_LETTER_BYTES = 8 * 1024 * 1024;

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

async function uniqueSlugForDisplayName(displayName: string): Promise<string> {
  const base = slugify(displayName);
  let slug = base;
  for (let n = 0; n < 60; n += 1) {
    const existing = await db.select({ id: schools.id }).from(schools).where(eq(schools.slug, slug)).limit(1);
    if (existing.length === 0) return slug;
    slug = n === 0 ? `${base}-2` : `${base}-${n + 2}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function uploadClaimLetter(params: {
  schoolId: string;
  profileId: string;
  file: File;
}): Promise<{ ok: true; path: string; fileName: string } | { ok: false; error: string }> {
  const { schoolId, profileId, file } = params;
  if (!/^[0-9a-f-]{36}$/i.test(schoolId) || !/^[0-9a-f-]{36}$/i.test(profileId)) {
    return { ok: false, error: "Invalid school or profile id." };
  }
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Upload a request letter before sending your claim." };
  }
  if (file.size > MAX_LETTER_BYTES) {
    return { ok: false, error: "Request letter must be 8 MB or smaller." };
  }
  const supabase = serviceSupabase();
  if (!supabase) {
    return { ok: false, error: "Set SUPABASE_SERVICE_ROLE_KEY to enable claim letter uploads." };
  }
  const safeName = file.name.replace(/[^a-z0-9._-]/gi, "_").slice(0, 120) || "request-letter";
  const objectPath = `${schoolId}/${profileId}/${Date.now()}-${safeName}`;
  const buf = Buffer.from(await file.arrayBuffer());
  const { error } = await supabase.storage.from(SCHOOL_ADMIN_CLAIMS_BUCKET).upload(objectPath, buf, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, path: objectPath, fileName: safeName };
}

export async function submitSchoolAdminClaimFormAction(formData: FormData) {
  const user = await requireUser("/login?redirect=%2Fapply-school-admin");
  const mode = String(formData.get("mode") ?? "existing").trim();
  const letter = formData.get("letter");
  if (!(letter instanceof File)) {
    return { ok: false as const, error: "Upload a request letter before sending your claim." };
  }

  let schoolId = "";
  if (mode === "new") {
    const displayName = String(formData.get("displayName") ?? "").trim();
    const officialName = String(formData.get("officialName") ?? "").trim();
    const provinceId = String(formData.get("provinceId") ?? "").trim();
    const nicknameRaw = String(formData.get("nickname") ?? "").trim();
    const townRaw = String(formData.get("town") ?? "").trim();
    const websiteRaw = String(formData.get("website") ?? "").trim();

    if (displayName.length < 2 || officialName.length < 2) {
      return { ok: false as const, error: "Display name and official name are required." };
    }
    if (!/^[0-9a-f-]{36}$/i.test(provinceId)) {
      return { ok: false as const, error: "Choose a valid province." };
    }

    const slug = await uniqueSlugForDisplayName(displayName);
    const [inserted] = await db
      .insert(schools)
      .values({
        officialName,
        displayName,
        nickname: nicknameRaw || null,
        slug,
        provinceId,
        town: townRaw || null,
        website: websiteRaw || null,
        active: true,
      })
      .returning({ id: schools.id });
    schoolId = inserted.id;
  } else {
    const parsed = schoolIdSchema.safeParse({ schoolId: String(formData.get("schoolId") ?? "") });
    if (!parsed.success) {
      return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
    }
    schoolId = parsed.data.schoolId;
  }

  const [dup] = await db
    .select({ id: schoolAdminMemberships.id })
    .from(schoolAdminMemberships)
    .where(
      and(
        eq(schoolAdminMemberships.profileId, user.id),
        eq(schoolAdminMemberships.schoolId, schoolId),
        ne(schoolAdminMemberships.status, "REVOKED"),
      ),
    )
    .limit(1);

  if (dup) {
    return {
      ok: false as const,
      error: "You already have a pending or active claim for this school.",
    };
  }

  const uploaded = await uploadClaimLetter({ schoolId, profileId: user.id, file: letter });
  if (!uploaded.ok) return { ok: false as const, error: uploaded.error };

  await db.insert(schoolAdminMemberships).values({
    profileId: user.id,
    schoolId,
    status: "PENDING",
    requestedLetterPath: uploaded.path,
    requestedLetterFileName: uploaded.fileName,
  });

  revalidatePath("/school-admin");
  revalidatePath("/apply-school-admin");
  revalidatePath("/moderator");
  return { ok: true as const };
}

export async function requestSchoolAdminMembershipAction(input: unknown) {
  void input;
  return {
    ok: false as const,
    error: "Use the new school admin application form to upload a request letter before claiming.",
  };
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
