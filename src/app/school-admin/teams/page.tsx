import { redirect } from "next/navigation";
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
import { getProfile } from "@/lib/auth";
import { adminListSchools, adminListTeamsForSchoolIds } from "@/lib/data/admin";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { isDatabaseConfigured } from "@/lib/db-safe";

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
                  <TableCell className="text-right">
                    <LinkButton href={`/school-admin/teams/${r.team.id}`} variant="outline" size="sm">
                      Edit
                    </LinkButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
