import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { getProfile } from "@/lib/auth";
import { adminListSchools, adminListTeamsForSchoolIds } from "@/lib/data/admin";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { SCHOOL_SPORTS, schoolSportLabel } from "@/lib/sports";

export default async function SchoolAdminExportPage() {
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
        <h1 className="text-2xl font-bold">Export</h1>
        <p className="text-sm text-muted-foreground">
          Approve a school link first, then you can export results here.
        </p>
      </div>
    );
  }

  const [allSchools, teamRows] = await Promise.all([
    adminListSchools(),
    adminListTeamsForSchoolIds(managed),
  ]);
  const schoolOptions = allSchools.filter((r) => managed.includes(r.school.id));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Export results</h1>
        <p className="text-sm text-muted-foreground">
          Download CSV or Excel of fixtures and scores for your linked school(s). Use the filters below, then choose
          your format.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Narrow by school, optional team, sport, date range, text search, or verified-only. Rows are ordered from
            most recent match date first (up to 5&nbsp;000 rows).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid max-w-xl gap-4" action="/api/school-admin/export" method="get" target="_blank">
            <div className="space-y-1">
              <Label htmlFor="format">Format</Label>
              <select
                id="format"
                name="format"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                defaultValue="csv"
              >
                <option value="csv">CSV (.csv)</option>
                <option value="xlsx">Excel (.xlsx)</option>
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="schoolId">School (optional)</Label>
              <select
                id="schoolId"
                name="schoolId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                defaultValue=""
              >
                <option value="">All linked schools</option>
                {schoolOptions.map(({ school }) => (
                  <option key={school.id} value={school.id}>
                    {school.displayName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="teamId">Team (optional)</Label>
              <select
                id="teamId"
                name="teamId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                defaultValue=""
              >
                <option value="">Any team</option>
                {teamRows.map((r) => (
                  <option key={r.team.id} value={r.team.id}>
                    {r.schoolName} · {r.team.sport} · {r.team.ageGroup} {r.team.teamLabel}
                    {r.team.gender ? ` · ${r.team.gender}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="sport">Sport (optional)</Label>
              <select
                id="sport"
                name="sport"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                defaultValue=""
              >
                <option value="">Any sport</option>
                {SCHOOL_SPORTS.map((s) => (
                  <option key={s} value={s}>
                    {schoolSportLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="dateFrom">Match date from</Label>
                <input
                  id="dateFrom"
                  name="dateFrom"
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dateTo">Match date to</Label>
                <input
                  id="dateTo"
                  name="dateTo"
                  type="date"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="q">Search (optional, min. 2 characters)</Label>
              <input
                id="q"
                name="q"
                placeholder="School name, competition, season…"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="verifiedOnly" name="verifiedOnly" value="1" className="size-4 rounded border" />
              <Label htmlFor="verifiedOnly" className="font-normal">
                Verified / published only
              </Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="submit">Download export</Button>
              <Button type="reset" variant="outline">
                Clear fields
              </Button>
              <Link href="/school-admin" className="inline-flex items-center text-sm text-primary hover:underline">
                Back to overview
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
