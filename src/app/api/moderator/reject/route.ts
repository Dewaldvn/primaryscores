import { NextRequest, NextResponse } from "next/server";
import { getSessionProfileForApi, requireProfileRoles } from "@/lib/api/session-profile";
import { rejectSubmissionInDb } from "@/lib/backend/moderation-service";
import { moderationRejectSchema } from "@/lib/validators/submission";

export const dynamic = "force-dynamic";

/** Reject a submission (session: MODERATOR or ADMIN). */
export async function POST(req: NextRequest) {
  const auth = await getSessionProfileForApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const gate = requireProfileRoles(auth.profile, ["MODERATOR", "ADMIN"]);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = moderationRejectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  await rejectSubmissionInDb({ profileId: auth.profile.id }, parsed.data);
  return NextResponse.json({ ok: true });
}
