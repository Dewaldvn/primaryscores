import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminScoresTable } from "@/components/admin-scores-table";
import { getProfile } from "@/lib/auth";
import { adminGetTeamById, adminListAllResults } from "@/lib/data/admin";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { redirect } from "next/navigation";

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default async function SchoolAdminScoresPage({ searchParams }: Props) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const profile = await getProfile();
  if (!profile || profile.role !== "SCHOOL_ADMIN") {
    redirect("/login");
  }

  const managed = await getActiveManagedSchoolIds(profile.id);
  if (managed.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Scores</h1>
        <p className="text-sm text-muted-foreground">
          You need an approved school link before you can edit scores. Go to{" "}
          <a href="/school-admin/claim" className="text-primary underline">
            Link a school
          </a>
          .
        </p>
      </div>
    );
  }

  const q = (k: string) => {
    const v = searchParams[k];
    return Array.isArray(v) ? v[0] : v;
  };

  const search = q("q") ?? "";
  const page = Math.max(1, Number(q("page")) || 1);
  const pageSize = 25;

  const rawTeamId = q("teamId");
  let teamFilterId: string | undefined;
  let teamFilterLabel: string | null = null;
  if (rawTeamId) {
    const teamRow = await adminGetTeamById(rawTeamId);
    if (teamRow && managed.includes(teamRow.team.schoolId)) {
      teamFilterId = rawTeamId;
      teamFilterLabel = `${teamRow.schoolName} · ${teamRow.team.sport} · ${teamRow.team.ageGroup} ${teamRow.team.teamLabel}${
        teamRow.team.gender ? ` · ${teamRow.team.gender}` : ""
      }`;
    }
  }

  const { rows, total, page: p, pageSize: ps } = await adminListAllResults({
    page,
    pageSize,
    search: search.trim() || undefined,
    scopeSchoolIds: managed,
    teamId: teamFilterId,
  });

  const serialized = rows.map((r) => ({
    resultId: r.resultId,
    fixtureId: r.fixtureId,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    verificationLevel: r.verificationLevel as
      | "SUBMITTED"
      | "MODERATOR_VERIFIED"
      | "SOURCE_VERIFIED",
    isVerified: r.isVerified,
    publishedAt: r.publishedAt instanceof Date ? r.publishedAt.toISOString() : null,
    matchDate: r.matchDate,
    venue: r.venue,
    recordingUrl: r.recordingUrl,
    homeSchoolName: r.homeSchoolName,
    awaySchoolName: r.awaySchoolName,
    homeSchoolLogoPath: r.homeSchoolLogoPath,
    awaySchoolLogoPath: r.awaySchoolLogoPath,
    competitionName: r.competitionName,
    seasonName: r.seasonName,
    provinceName: r.provinceName,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Scores & results</h1>
        <p className="text-sm text-muted-foreground">
          Fixtures involving your linked school(s). You can publish updates as moderator-verified;
          source-verified is reserved for site moderators.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your schools&apos; results</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminScoresTable
            rows={serialized}
            total={total}
            page={p}
            pageSize={ps}
            initialSearch={search}
            scoresBasePath="/school-admin/scores"
            verificationCap="moderator_only"
            teamFilterId={teamFilterId}
            teamFilterLabel={teamFilterLabel}
          />
        </CardContent>
      </Card>
    </div>
  );
}
