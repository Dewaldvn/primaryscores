import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";
import { AdminTeamForm } from "@/components/admin-team-form";
import { AdminTeamsSchoolSearch } from "@/components/admin-teams-school-search";
import { adminListTeams, adminListSchools, adminListTeamsForSchoolIds } from "@/lib/data/admin";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { compareTeamsBySportAndChronologicalAge } from "@/lib/team-sort";
import { SCHOOL_SPORTS, schoolSportLabel, type SchoolSport } from "@/lib/sports";

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
  const teamsBySport = new Map<SchoolSport, typeof selectedSchoolTeams>();
  for (const sport of SCHOOL_SPORTS) teamsBySport.set(sport, []);
  for (const row of selectedSchoolTeams) {
    const sport = row.team.sport as SchoolSport;
    const list = teamsBySport.get(sport);
    if (list) list.push(row);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-sm text-muted-foreground">
          Link age-group sides to schools. Showing the latest 15 teams{schoolSearch ? " matching your search" : ""}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          <AdminTeamsSchoolSearch initialValue={schoolSearch} selectedSchoolId={selectedSchool?.id} />
          {selectedSchool ? (
            <div className="space-y-4 rounded-md border p-4">
              <p className="text-sm font-medium">
                Teams for {selectedSchool.displayName}, arranged by sport and age group.
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                {SCHOOL_SPORTS.map((sport) => {
                  const sportRows = teamsBySport.get(sport) ?? [];
                  return (
                    <div key={sport} className="rounded-md border p-3">
                      <h3 className="mb-2 text-sm font-semibold">{schoolSportLabel(sport)}</h3>
                      {sportRows.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No teams listed.</p>
                      ) : (
                        <ul className="space-y-1 text-sm">
                          {sportRows.map((r) => (
                            <li key={r.team.id} className="flex items-center justify-between gap-2">
                              <span>
                                {r.team.ageGroup}
                                {r.team.gender ? ` · ${r.team.gender}` : ""} · {r.team.teamLabel}
                              </span>
                              <LinkButton href={`/admin/teams/${r.team.id}`} variant="ghost" size="sm">
                                Edit
                              </LinkButton>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>School</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Nickname</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.team.id}>
                  <TableCell>{r.schoolName}</TableCell>
                  <TableCell>{r.team.sport}</TableCell>
                  <TableCell>{r.team.gender ?? "—"}</TableCell>
                  <TableCell>{r.team.ageGroup}</TableCell>
                  <TableCell>{r.team.teamLabel}</TableCell>
                  <TableCell className="text-muted-foreground">{r.team.teamNickname ?? "—"}</TableCell>
                  <TableCell>{r.team.active ? "Yes" : "No"}</TableCell>
                  <TableCell className="text-right">
                    <LinkButton href={`/admin/teams/${r.team.id}`} variant="outline" size="sm">
                      Edit
                    </LinkButton>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    No teams found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
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
