import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfileForApi, requireProfileRoles } from "@/lib/api/session-profile";
import { updateUserRoleInDb } from "@/lib/backend/admin-users-service";
import type { ProfileRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["PUBLIC", "CONTRIBUTOR", "MODERATOR", "ADMIN", "SCHOOL_ADMIN"]),
});

/** Update a user's profile role (session: ADMIN only). */
export async function PATCH(req: NextRequest) {
  const auth = await getSessionProfileForApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const gate = requireProfileRoles(auth.profile, ["ADMIN"]);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  if (parsed.data.userId === auth.profile.id && parsed.data.role !== "ADMIN") {
    return NextResponse.json({ error: "You cannot remove your own admin role via this API." }, { status: 400 });
  }

  await updateUserRoleInDb(parsed.data.userId, parsed.data.role as ProfileRole);
  return NextResponse.json({ ok: true });
}
