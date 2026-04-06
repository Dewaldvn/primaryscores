import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminResultsImportPanel } from "@/components/admin-results-import-panel";
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
          Download the template, fill it in, then upload to bulk-create results.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Results CSV import</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminResultsImportPanel />
        </CardContent>
      </Card>
    </div>
  );
}

