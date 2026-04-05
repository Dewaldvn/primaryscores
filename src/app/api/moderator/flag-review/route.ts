import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getSessionProfileForApi, requireProfileRoles } from "@/lib/api/session-profile";
import { flagSubmissionNeedsReviewInDb } from "@/lib/backend/moderation-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  submissionId: z.string().uuid(),
});

/** Mark submission as NEEDS_REVIEW (session: MODERATOR or ADMIN). */
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

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  await flagSubmissionNeedsReviewInDb({ profileId: auth.profile.id }, parsed.data.submissionId);
  return NextResponse.json({ ok: true });
}
