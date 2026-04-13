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
import { adminListTeams, adminListSchools } from "@/lib/data/admin";
import { isDatabaseConfigured } from "@/lib/db-safe";
import type { SchoolSport } from "@/lib/sports";
import { compareTeamsBySportAndChronologicalAge } from "@/lib/team-sort";

export default async function AdminTeamsPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const [rows, schoolRows] = await Promise.all([adminListTeams(), adminListSchools()]);
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
  const schools = schoolRows.map((r) => ({ id: r.school.id, label: r.school.displayName }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Teams</h1>
        <p className="text-sm text-muted-foreground">
          Link age-group sides to schools. Hockey teams must specify boys or girls.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Roster</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
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
              {orderedRows.map((r) => (
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
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add team</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminTeamForm schools={schools} />
        </CardContent>
      </Card>
    </div>
  );
}
