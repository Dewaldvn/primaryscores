import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";
import { AdminResultsImportPanel } from "@/components/admin-results-import-panel";
import { AdminSchoolsImportPanel } from "@/components/admin-schools-import-panel";
import { AdminExportResultsFilters } from "@/components/admin-export-results-filters";
import { AdminExportSchoolsTeamsFilters } from "@/components/admin-export-schools-teams-filters";
import { isDatabaseConfigured } from "@/lib/db-safe";
import Link from "next/link";
import { listProvinces } from "@/lib/data/schools";

export default async function AdminImportExportPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const provinces = await listProvinces();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Import / export</h1>
        <p className="text-sm text-muted-foreground">
          Bulk work in <span className="font-medium">CSV</span> or <span className="font-medium">Excel</span> (
          <code className="text-xs">.xlsx</code>). Use templates where provided, then upload. Exports are
          immediate downloads.
        </p>
        <p className="pt-2 text-sm text-muted-foreground">
          <Link href="/admin/schools" className="text-primary underline-offset-4 hover:underline">
            Schools
          </Link>
          {" · "}
          <Link href="/admin/teams" className="text-primary underline-offset-4 hover:underline">
            Teams
          </Link>
          {" · "}
          <Link href="/admin/users" className="text-primary underline-offset-4 hover:underline">
            Users
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Templates</CardTitle>
          <CardDescription>Download templates in CSV or Excel.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Schools import template</p>
            <div className="flex flex-wrap gap-2">
              <LinkButton variant="outline" size="sm" href="/api/admin/import/schools-template?format=csv">
                Download CSV template
              </LinkButton>
              <LinkButton variant="outline" size="sm" href="/api/admin/import/schools-template?format=xlsx">
                Download Excel template
              </LinkButton>
            </div>
          </div>
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Results import template</p>
            <div className="flex flex-wrap gap-2">
              <LinkButton variant="outline" size="sm" href="/api/admin/import/results-template?format=csv">
                Download CSV template
              </LinkButton>
              <LinkButton variant="outline" size="sm" href="/api/admin/import/results-template?format=xlsx">
                Download Excel template
              </LinkButton>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schools</CardTitle>
          <CardDescription>Import from template; export selected schools (and teams in Excel export).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Export schools (and teams)</h3>
            <AdminExportSchoolsTeamsFilters
              provinces={provinces.map((p) => ({ id: p.id, name: p.name, code: p.code }))}
            />
          </div>
          <div className="border-t pt-8">
            <h3 className="mb-3 text-sm font-semibold">Import schools</h3>
          <AdminSchoolsImportPanel />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scores & results</CardTitle>
          <CardDescription>
            Import verified-style results from template (same pipeline as before). Export with filters:
            sport, schools, teams, date range.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div>
            <h3 className="mb-3 text-sm font-semibold">Export results</h3>
            <AdminExportResultsFilters />
          </div>
          <div className="border-t pt-8">
            <h3 className="mb-3 text-sm font-semibold">Import results</h3>
            <AdminResultsImportPanel />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>
            Export registered profiles (roles and onboarding). New accounts are created via Supabase Auth—use the{" "}
            <Link href="/admin/users" className="text-primary underline-offset-4 hover:underline">
              Users
            </Link>{" "}
            page to change roles after signup. There is no bulk user creation here yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <LinkButton variant="outline" size="sm" href="/api/admin/export/profiles">
              Export users (CSV)
            </LinkButton>
            <LinkButton variant="outline" size="sm" href="/api/admin/export/profiles?format=xlsx">
              Export users (Excel)
            </LinkButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
