import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminResultsImportPanel } from "@/components/admin-results-import-panel";
import { AdminSchoolsImportPanel } from "@/components/admin-schools-import-panel";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default function AdminImportPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import</h1>
        <p className="text-sm text-muted-foreground">
          Download a template (CSV or Excel), fill it in, then upload to import in bulk.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results import</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminResultsImportPanel />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Schools import</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminSchoolsImportPanel />
        </CardContent>
      </Card>
    </div>
  );
}

