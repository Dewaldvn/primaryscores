import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";
import { AdminTeamForm } from "@/components/admin-team-form";
import { SchoolAdminTeamsRosterTable } from "@/components/school-admin-teams-roster-table";
import { getProfile } from "@/lib/auth";
import { adminListSchools, adminListTeamsForSchoolIds } from "@/lib/data/admin";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { isDatabaseConfigured } from "@/lib/db-safe";
import type { SchoolSport } from "@/lib/sports";
import { compareTeamsBySportAndChronologicalAge } from "@/lib/team-sort";

export default async function SchoolAdminTeamsPage() {
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
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-sm text-muted-foreground">
          Approve a school link first, then you can manage teams here.
        </p>
      </div>
    );
  }

  const [rows, allSchoolRows] = await Promise.all([
    adminListTeamsForSchoolIds(managed),
    adminListSchools(),
  ]);
  const orderedRows = [...rows].sort((a, b) => {
    const schoolCmp = a.schoolName.localeCompare(b.schoolName, undefined, { sensitivity: "base" });
    if (schoolCmp !== 0) return schoolCmp;
    return compareTeamsBySportAndChronologicalAge(
      {
        sport: a.team.sport as SchoolSport,
        ageGroup: a.team.ageGroup,
        gender: a.team.gender,
        teamLabel: a.team.teamLabel,
      },
      {
        sport: b.team.sport as SchoolSport,
        ageGroup: b.team.ageGroup,
        gender: b.team.gender,
        teamLabel: b.team.teamLabel,
      },
    );
  });
  const schools = managed.map((id) => {
    const hit = allSchoolRows.find((r) => r.school.id === id);
    return { id, label: hit?.school.displayName ?? id };
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-sm text-muted-foreground">
          All teams for your linked school(s). Add sides for rugby, netball, hockey, and soccer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <SchoolAdminTeamsRosterTable
            rows={orderedRows.map((r) => ({
              id: r.team.id,
              schoolName: r.schoolName,
              sport: r.team.sport,
              gender: r.team.gender,
              ageGroup: r.team.ageGroup,
              teamLabel: r.team.teamLabel,
              teamNickname: r.team.teamNickname ?? null,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
          <CardTitle>Add a team</CardTitle>
          <div className="flex flex-wrap gap-2">
            {managed.map((sid) => (
              <LinkButton key={sid} variant="secondary" size="sm" href={`/school-admin/teams/new?schoolId=${sid}`}>
                New team…
              </LinkButton>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <AdminTeamForm schools={schools} />
        </CardContent>
      </Card>
    </div>
  );
}
