"use server";

import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/db/schema";
import { requireRole, requireUser, type ProfileRole } from "@/lib/auth";
import { SCHOOL_LOGOS_BUCKET } from "@/lib/school-logo";
import { profileManagesSchool } from "@/lib/school-admin-access";

const MAX_BYTES = 2 * 1024 * 1024;

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

type UploadBytesResult = { ok: true; logoPath: string } | { ok: false; error: string };

async function validateAndUploadSchoolLogoBytes(params: {
  schoolId: string;
  file: File;
}): Promise<UploadBytesResult> {
  const { schoolId, file } = params;

  if (!/^[0-9a-f-]{36}$/i.test(schoolId) || file.size === 0) {
    return { ok: false, error: "Invalid school or file." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "Please upload an image file." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be 2 MB or smaller." };
  }

  const supabase = serviceSupabase();
  if (!supabase) {
    return {
      ok: false,
      error: "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to enable logo uploads.",
    };
  }

  const rawExt = file.name.includes(".") ? file.name.split(".").pop() ?? "png" : "png";
  const ext = rawExt.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "png";
  const objectPath = `${schoolId}/logo.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(SCHOOL_LOGOS_BUCKET).upload(objectPath, buf, {
    contentType: file.type || "image/png",
    upsert: true,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, logoPath: objectPath };
}

async function assertSchoolLogoWriteAccess(params: {
  profileId: string;
  role: ProfileRole;
  schoolId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (params.role === "ADMIN") return { ok: true };
  if (params.role === "SCHOOL_ADMIN") {
    const ok = await profileManagesSchool(params.profileId, params.schoolId);
    if (!ok) return { ok: false, error: "You can only update logos for your linked school." };
    return { ok: true };
  }
  return { ok: false, error: "Insufficient permissions." };
}

export async function uploadSchoolLogoAction(formData: FormData) {
  const { profile } = await requireRole(["ADMIN", "SCHOOL_ADMIN"]);
  const schoolId = String(formData.get("schoolId") ?? "").trim();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false as const, error: "Invalid school or file." };
  }

  const gate = await assertSchoolLogoWriteAccess({
    profileId: profile.id,
    role: profile.role,
    schoolId,
  });
  if (!gate.ok) {
    return { ok: false as const, error: gate.error };
  }

  const uploaded = await validateAndUploadSchoolLogoBytes({ schoolId, file });
  if (!uploaded.ok) {
    return { ok: false as const, error: uploaded.error };
  }

  const now = new Date();
  await db
    .update(schools)
    .set({ logoPath: uploaded.logoPath, updatedAt: now })
    .where(eq(schools.id, schoolId));

  return { ok: true as const };
}

/** Signed-in users may set a crest only while `schools.logo_path` is still empty (e.g. right after adding a school). */
export async function uploadSchoolLogoContributorAction(formData: FormData) {
  const returnToRaw = String(formData.get("_returnTo") ?? "").trim();
  const loginRedirect =
    returnToRaw === "find-school"
      ? "/login?redirect=%2Ffind-school"
      : "/login?redirect=%2Fadd-team"; // includes empty / unknown → same as other contributor flows
  await requireUser(loginRedirect);

  const schoolId = String(formData.get("schoolId") ?? "").trim();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { ok: false as const, error: "Invalid school or file." };
  }

  const [row] = await db
    .select({ logoPath: schools.logoPath })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

  if (!row) {
    return { ok: false as const, error: "School not found." };
  }
  if (row.logoPath?.trim()) {
    return {
      ok: false as const,
      error: "This school already has a logo. Contact an admin to replace it.",
    };
  }

  const uploaded = await validateAndUploadSchoolLogoBytes({ schoolId, file });
  if (!uploaded.ok) {
    return { ok: false as const, error: uploaded.error };
  }

  const now = new Date();
  await db
    .update(schools)
    .set({ logoPath: uploaded.logoPath, updatedAt: now })
    .where(eq(schools.id, schoolId));

  return { ok: true as const, logoPath: uploaded.logoPath };
}

export async function removeSchoolLogoAction(schoolId: string) {
  const { profile } = await requireRole(["ADMIN", "SCHOOL_ADMIN"]);
  if (!/^[0-9a-f-]{36}$/i.test(schoolId)) {
    return { ok: false as const, error: "Invalid school." };
  }

  const gate = await assertSchoolLogoWriteAccess({
    profileId: profile.id,
    role: profile.role,
    schoolId,
  });
  if (!gate.ok) {
    return { ok: false as const, error: gate.error };
  }

  const [row] = await db
    .select({ logoPath: schools.logoPath })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);

  const path = row?.logoPath ?? null;
  const now = new Date();
  await db.update(schools).set({ logoPath: null, updatedAt: now }).where(eq(schools.id, schoolId));

  if (path) {
    const supabase = serviceSupabase();
    if (supabase) {
      await supabase.storage.from(SCHOOL_LOGOS_BUCKET).remove([path]);
    }
  }

  return { ok: true as const };
}
