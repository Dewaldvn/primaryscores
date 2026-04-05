import { NextRequest, NextResponse } from "next/server";
import { getSessionProfileForApi, requireProfileRoles } from "@/lib/api/session-profile";
import { approveSubmissionInDb } from "@/lib/backend/moderation-service";
import { moderationApproveSchema } from "@/lib/validators/submission";

export const dynamic = "force-dynamic";

/** Approve a submission and publish fixture + result (session: MODERATOR or ADMIN). */
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

  const parsed = moderationApproveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const result = await approveSubmissionInDb({ profileId: auth.profile.id }, parsed.data);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, fixtureId: result.fixtureId });
}
