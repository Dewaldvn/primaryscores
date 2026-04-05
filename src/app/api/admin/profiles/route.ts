import { NextResponse } from "next/server";
import { getSessionProfileForApi, requireProfileRoles } from "@/lib/api/session-profile";
import { adminListProfiles } from "@/lib/data/admin";
import { isDatabaseConfigured } from "@/lib/db-safe";

export const dynamic = "force-dynamic";

/** List all profiles with roles (session: ADMIN only). */
export async function GET() {
  const auth = await getSessionProfileForApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const gate = requireProfileRoles(auth.profile, ["ADMIN"]);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const rows = await adminListProfiles();
  return NextResponse.json({
    profiles: rows.map((p) => ({
      id: p.id,
      email: p.email,
      displayName: p.displayName,
      role: p.role,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      updatedAt: p.updatedAt instanceof Date ? p.updatedAt.toISOString() : p.updatedAt,
    })),
  });
}
