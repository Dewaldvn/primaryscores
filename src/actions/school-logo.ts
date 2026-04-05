"use server";

import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { SCHOOL_LOGOS_BUCKET } from "@/lib/school-logo";

const MAX_BYTES = 2 * 1024 * 1024;

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function uploadSchoolLogoAction(formData: FormData) {
  await requireRole(["ADMIN"]);
  const schoolId = String(formData.get("schoolId") ?? "").trim();
  const file = formData.get("file");

  if (!/^[0-9a-f-]{36}$/i.test(schoolId) || !(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Invalid school or file." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false as const, error: "Please upload an image file." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, error: "Image must be 2 MB or smaller." };
  }

  const supabase = serviceSupabase();
  if (!supabase) {
    return {
      ok: false as const,
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
    return { ok: false as const, error: error.message };
  }

  const now = new Date();
  await db
    .update(schools)
    .set({ logoPath: objectPath, updatedAt: now })
    .where(eq(schools.id, schoolId));

  return { ok: true as const };
}

export async function removeSchoolLogoAction(schoolId: string) {
  await requireRole(["ADMIN"]);
  if (!/^[0-9a-f-]{36}$/i.test(schoolId)) {
    return { ok: false as const, error: "Invalid school." };
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
