import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSeasonCreateForm, AdminCompetitionCreateForm } from "@/components/admin-season-forms";
import { adminListSeasons, adminListCompetitions } from "@/lib/data/admin";
import { listProvinces } from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function AdminSeasonsPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const [seasonRows, compRows, provinces] = await Promise.all([
    adminListSeasons(),
    adminListCompetitions(),
    listProvinces(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Seasons & competitions</h1>
        <p className="text-sm text-muted-foreground">Baseline metadata for fixtures and archiving.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seasons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasonRows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.year}</TableCell>
                  <TableCell>{s.startDate}</TableCell>
                  <TableCell>{s.endDate}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminSeasonCreateForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Competitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compRows.map((r) => (
                <TableRow key={r.competition.id}>
                  <TableCell>{r.competition.name}</TableCell>
                  <TableCell>{r.provinceName ?? "—"}</TableCell>
                  <TableCell>{r.competition.level}</TableCell>
                  <TableCell>{r.competition.active ? "Yes" : "No"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <AdminCompetitionCreateForm provinces={provinces} />
        </CardContent>
      </Card>
    </div>
  );
}
