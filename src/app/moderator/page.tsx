import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ModeratorDashboard } from "@/components/moderator-dashboard";
import { listOpenSubmissions, moderatorSummary } from "@/lib/data/moderation";
import { listAllTeamsForModeration } from "@/lib/data/admin";
import { ensureU13TeamsForSchoolsMissingThem } from "@/lib/data/team-bootstrap";
import { listSeasons, listCompetitions } from "@/lib/data/reference";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function ModeratorPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Database not configured.</p>;
  }

  await ensureU13TeamsForSchoolsMissingThem();

  const [subs, teams, seasons, comps, summary] = await Promise.all([
    listOpenSubmissions(),
    listAllTeamsForModeration(),
    listSeasons(),
    listCompetitions(),
    moderatorSummary(),
  ]);

  const rows = subs.map((s) => ({
    id: s.submission.id,
    proposedHomeTeamName: s.submission.proposedHomeTeamName,
    proposedAwayTeamName: s.submission.proposedAwayTeamName,
    proposedHomeTeamId: s.submission.proposedHomeTeamId,
    proposedAwayTeamId: s.submission.proposedAwayTeamId,
    proposedSeasonId: s.submission.proposedSeasonId,
    proposedCompetitionId: s.submission.proposedCompetitionId,
    proposedMatchDate: s.submission.proposedMatchDate,
    proposedHomeScore: s.submission.proposedHomeScore,
    proposedAwayScore: s.submission.proposedAwayScore,
    proposedVenue: s.submission.proposedVenue,
    moderationStatus: s.submission.moderationStatus,
    submittedAt: s.submission.submittedAt.toISOString(),
    sourceUrl: s.submission.sourceUrl,
    notes: s.submission.notes,
    submitterEmail: s.submitterEmail,
  }));

  const teamOptions = teams.map((t) => ({
    teamId: t.teamId,
    label: `${t.schoolName} — ${t.ageGroup} ${t.teamLabel}${t.active ? "" : " (inactive)"}`,
  }));

  const seasonOptions = seasons.map((x) => ({
    id: x.id,
    label: `${x.name} (${x.year})`,
  }));

  const competitionOptions = comps.map((c) => ({
    id: c.id,
    label: c.name,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Moderation</h1>
        <p className="text-sm text-muted-foreground">
          Approve submissions into verified fixtures, or reject with a clear reason. Actions are logged.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.pending}</CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Needs review</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.needsReview}</CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">New today</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{summary.submittedToday}</CardContent>
        </Card>
      </div>

      <ModeratorDashboard
        rows={rows}
        teamOptions={teamOptions}
        seasonOptions={seasonOptions}
        competitionOptions={competitionOptions}
      />
    </div>
  );
}
