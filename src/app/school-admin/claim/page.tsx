import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolAdminClaimForm } from "@/components/school-admin-claim-form";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function SchoolAdminClaimPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Link a school</h1>
        <p className="text-sm text-muted-foreground">
          Search for your school and send a link request. A moderator will approve or reject it. You
          need the School Admin role on your account (set by a site administrator).
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request access</CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolAdminClaimForm />
        </CardContent>
      </Card>
    </div>
  );
}
