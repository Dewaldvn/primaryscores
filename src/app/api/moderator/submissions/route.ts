import { NextResponse } from "next/server";
import { getSessionProfileForApi, requireProfileRoles } from "@/lib/api/session-profile";
import { listOpenSubmissions } from "@/lib/data/moderation";

export const dynamic = "force-dynamic";

/** List submissions pending moderator review (session: MODERATOR or ADMIN). */
export async function GET() {
  const auth = await getSessionProfileForApi();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const gate = requireProfileRoles(auth.profile, ["MODERATOR", "ADMIN"]);
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const rows = await listOpenSubmissions();
  return NextResponse.json({
    submissions: rows.map(({ submission, submitterEmail, submitterName }) => ({
      id: submission.id,
      proposedHomeTeamName: submission.proposedHomeTeamName,
      proposedAwayTeamName: submission.proposedAwayTeamName,
      proposedHomeTeamId: submission.proposedHomeTeamId,
      proposedAwayTeamId: submission.proposedAwayTeamId,
      proposedMatchDate: submission.proposedMatchDate,
      proposedHomeScore: submission.proposedHomeScore,
      proposedAwayScore: submission.proposedAwayScore,
      proposedVenue: submission.proposedVenue,
      proposedCompetitionId: submission.proposedCompetitionId,
      proposedSeasonId: submission.proposedSeasonId,
      proposedProvinceId: submission.proposedProvinceId,
      moderationStatus: submission.moderationStatus,
      sourceUrl: submission.sourceUrl,
      notes: submission.notes,
      submittedAt:
        submission.submittedAt instanceof Date
          ? submission.submittedAt.toISOString()
          : submission.submittedAt,
      submitterEmail,
      submitterName,
    })),
  });
}
