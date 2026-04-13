import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolAdminClaimForm } from "@/components/school-admin-claim-form";
import { getSessionUser } from "@/lib/auth";
import { listProvinces } from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function ApplySchoolAdminPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const user = await getSessionUser();
  if (!user) {
    redirect("/login?redirect=%2Fapply-school-admin");
  }

  const provinces = await listProvinces();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Apply for School Administration Privileges</h1>
        <p className="text-sm text-muted-foreground">
          Search for your school and claim it, or add your school first and then claim it.
          A request letter on school letterhead is required for every claim.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Submit a claim</CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolAdminClaimForm provinces={provinces} />
        </CardContent>
      </Card>
    </div>
  );
}
