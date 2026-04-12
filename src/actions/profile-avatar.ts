"use server";

import { createClient } from "@supabase/supabase-js";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { USER_AVATARS_BUCKET } from "@/lib/profile-avatar";

const MAX_BYTES = 2 * 1024 * 1024;

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function uploadProfileAvatarAction(formData: FormData) {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "Sign in to upload a profile picture." };
  }

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Choose an image file." };
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
      error: "Set SUPABASE_SERVICE_ROLE_KEY in .env.local to enable avatar uploads.",
    };
  }

  const rawExt = file.name.includes(".") ? file.name.split(".").pop() ?? "png" : "png";
  const ext = rawExt.replace(/[^a-z0-9]/gi, "").slice(0, 5) || "png";
  const objectPath = `${user.id}/avatar.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from(USER_AVATARS_BUCKET).upload(objectPath, buf, {
    contentType: file.type || "image/png",
    upsert: true,
  });

  if (error) {
    return { ok: false as const, error: error.message };
  }

  const now = new Date();
  await db.update(profiles).set({ avatarPath: objectPath, updatedAt: now }).where(eq(profiles.id, user.id));

  return { ok: true as const };
}

export async function removeProfileAvatarAction() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "Sign in to remove your picture." };
  }

  const [row] = await db
    .select({ avatarPath: profiles.avatarPath })
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  const path = row?.avatarPath ?? null;
  const now = new Date();
  await db.update(profiles).set({ avatarPath: null, updatedAt: now }).where(eq(profiles.id, user.id));

  const supabase = serviceSupabase();
  if (supabase && path) {
    await supabase.storage.from(USER_AVATARS_BUCKET).remove([path]);
  }

  return { ok: true as const };
}
