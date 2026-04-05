import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AdminSeasonForm,
  AdminCompetitionForm,
  type CompetitionFormInitial,
  type SeasonFormInitial,
} from "@/components/admin-season-forms";
import { adminListSeasons, adminListCompetitions } from "@/lib/data/admin";
import { listProvinces } from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";

type Props = { searchParams: Record<string, string | string[] | undefined> };

function qp(searchParams: Props["searchParams"], key: string) {
  const v = searchParams[key];
  return Array.isArray(v) ? v[0] : v;
}

export default async function AdminSeasonsPage({ searchParams }: Props) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const [seasonRows, compRows, provinces] = await Promise.all([
    adminListSeasons(),
    adminListCompetitions(),
    listProvinces(),
  ]);

  const editSeasonId = qp(searchParams, "season");
  const editCompetitionId = qp(searchParams, "competition");

  const editingSeason = editSeasonId ? seasonRows.find((s) => s.id === editSeasonId) : undefined;
  const editingComp = editCompetitionId
    ? compRows.find((r) => r.competition.id === editCompetitionId)
    : undefined;

  const seasonInitial: SeasonFormInitial | undefined = editingSeason
    ? {
        id: editingSeason.id,
        year: editingSeason.year,
        name: editingSeason.name,
        startDate: String(editingSeason.startDate),
        endDate: String(editingSeason.endDate),
      }
    : undefined;

  const competitionInitial: CompetitionFormInitial | undefined = editingComp
    ? {
        id: editingComp.competition.id,
        name: editingComp.competition.name,
        provinceId: editingComp.competition.provinceId,
        organiser: editingComp.competition.organiser,
        level: editingComp.competition.level,
        active: editingComp.competition.active,
      }
    : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Seasons & competitions</h1>
        <p className="text-sm text-muted-foreground">Baseline metadata for fixtures and archiving.</p>
      </div>

      <Card id="admin-seasons-section">
        <CardHeader>
          <CardTitle>Seasons</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {seasonInitial ? (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
              <h3 className="mb-3 text-sm font-medium">Edit season</h3>
              <AdminSeasonForm initial={seasonInitial} />
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Start</TableHead>
                <TableHead>End</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasonRows.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.year}</TableCell>
                  <TableCell>{s.startDate}</TableCell>
                  <TableCell>{s.endDate}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/seasons?season=${s.id}#admin-seasons-section`}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Add season</h3>
            <AdminSeasonForm />
          </div>
        </CardContent>
      </Card>

      <Card id="admin-competitions-section">
        <CardHeader>
          <CardTitle>Competitions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {competitionInitial ? (
            <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
              <h3 className="mb-3 text-sm font-medium">Edit competition</h3>
              <AdminCompetitionForm provinces={provinces} initial={competitionInitial} />
            </div>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-[100px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {compRows.map((r) => (
                <TableRow key={r.competition.id}>
                  <TableCell>{r.competition.name}</TableCell>
                  <TableCell>{r.provinceName ?? "—"}</TableCell>
                  <TableCell>{r.competition.level}</TableCell>
                  <TableCell>{r.competition.active ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/seasons?competition=${r.competition.id}#admin-competitions-section`}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div>
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">Add competition</h3>
            <AdminCompetitionForm provinces={provinces} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
