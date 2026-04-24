import Link from "next/link";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AdminTeamForm } from "@/components/admin-team-form";
import { AdminTeamsRosterTable } from "@/components/admin-teams-roster-table";
import { AdminTeamsSchoolSearch } from "@/components/admin-teams-school-search";
import { adminListTeams, adminListSchools, adminListTeamsForSchoolIds } from "@/lib/data/admin";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { compareTeamsBySportAndChronologicalAge } from "@/lib/team-sort";
import type { SchoolSport } from "@/lib/sports";

type PageProps = { searchParams: Record<string, string | string[] | undefined> };

function qp(sp: PageProps["searchParams"], key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default async function AdminTeamsPage({ searchParams }: PageProps) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const schoolSearch = qp(searchParams, "school");
  const selectedSchoolIdRaw = qp(searchParams, "schoolId");
  const selectedSchoolId = isUuid(selectedSchoolIdRaw) ? selectedSchoolIdRaw : "";
  const [rows, schoolRows, selectedSchoolTeamsById] = await Promise.all([
    adminListTeams({ schoolName: schoolSearch || undefined, limit: 15 }),
    adminListSchools(),
    selectedSchoolId ? adminListTeamsForSchoolIds([selectedSchoolId]) : Promise.resolve([]),
  ]);
  const schools = schoolRows.map((r) => ({ id: r.school.id, label: r.school.displayName }));
  const selectedSchoolById =
    selectedSchoolId.length > 0 ? schoolRows.find((r) => r.school.id === selectedSchoolId)?.school : undefined;
  const selectedSchoolBySearch =
    !selectedSchoolById && schoolSearch.length >= 2
      ? schoolRows.find((r) => {
          const q = schoolSearch.toLowerCase();
          return (
            r.school.displayName.toLowerCase().includes(q) ||
            (r.school.nickname ? r.school.nickname.toLowerCase().includes(q) : false)
          );
        })?.school
      : undefined;
  const selectedSchool = selectedSchoolById ?? selectedSchoolBySearch;
  const selectedSchoolTeamsRaw =
    selectedSchoolById
      ? selectedSchoolTeamsById
      : selectedSchoolBySearch
        ? await adminListTeamsForSchoolIds([selectedSchoolBySearch.id])
        : [];
  const selectedSchoolTeams = [...selectedSchoolTeamsRaw].sort((a, b) =>
    compareTeamsBySportAndChronologicalAge(
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
    ),
  );
  const rosterRows = selectedSchool ? selectedSchoolTeams : rows;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Teams</h1>
        <Link href="/admin/school-admins" className="inline-block text-sm text-muted-foreground hover:underline">
          ← Back to school admins
        </Link>
        <p className="text-sm text-muted-foreground">
          Link age-group sides to schools.
          {selectedSchool
            ? ` Showing all teams for ${selectedSchool.displayName}, ordered by sport and age group.`
            : ` Showing the latest 15 teams${schoolSearch ? " matching your search" : ""}.`}
        </p>
        <a
          href="#add-team"
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            "inline-flex w-fit",
          )}
        >
          Add team
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          <AdminTeamsSchoolSearch initialValue={schoolSearch} selectedSchoolId={selectedSchool?.id} />
          <AdminTeamsRosterTable rows={rosterRows} />
        </CardContent>
      </Card>

      <Card id="add-team" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>Add team</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminTeamForm
            key={`add-team-${selectedSchool?.id ?? "none"}`}
            schools={schools}
            defaultSchoolId={selectedSchool?.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}
