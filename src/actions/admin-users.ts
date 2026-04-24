"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { deleteUserProfileInDb, updateUserRoleInDb } from "@/lib/backend/admin-users-service";
import { requireRole } from "@/lib/auth";
import type { ProfileRole } from "@/lib/auth";
import { signupDisplayNameSchema } from "@/lib/validators/auth";

const updateRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["CONTRIBUTOR", "MODERATOR", "ADMIN", "SCHOOL_ADMIN"]),
});

const deleteUserSchema = z.object({
  userId: z.string().uuid(),
});

const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(6, "Password must be at least 6 characters."),
  displayName: signupDisplayNameSchema,
  role: z.enum(["CONTRIBUTOR", "MODERATOR", "ADMIN", "SCHOOL_ADMIN"]),
});

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function createUserAsAdminAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = createUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid input", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { email, password, displayName, role } = parsed.data;
  const supabase = serviceSupabase();
  if (!supabase) {
    return { ok: false as const, error: "Set SUPABASE_SERVICE_ROLE_KEY in the server environment to create users." };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: displayName },
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return { ok: false as const, error: "An account with this email already exists." };
    }
    return { ok: false as const, error: error.message };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { ok: false as const, error: "User was not created (no id returned)." };
  }

  if (role !== "CONTRIBUTOR") {
    await updateUserRoleInDb(userId, role);
  }

  revalidatePath("/admin/users");
  return { ok: true as const, userId };
}

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

export async function deleteUserAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = deleteUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  await deleteUserProfileInDb(parsed.data.userId);
  return { ok: true as const };
}
