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

export default async function AdminTeamsPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const [rows, schoolRows] = await Promise.all([adminListTeams(), adminListSchools()]);
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
                <TableHead>First</TableHead>
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
                  <TableCell>{r.team.isFirstTeam ? "Yes" : "No"}</TableCell>
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
