import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";
import { getProfile } from "@/lib/auth";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { adminListSchools } from "@/lib/data/admin";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function SchoolAdminSchoolsHubPage() {
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
        <h1 className="text-2xl font-bold">School profile</h1>
        <p className="text-sm text-muted-foreground">
          Approve a school link first, then you can edit names and logos here.
        </p>
      </div>
    );
  }

  const all = await adminListSchools();
  const mine = all.filter((r) => managed.includes(r.school.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">School profile</h1>
        <p className="text-sm text-muted-foreground">
          Official name, short display name, optional nickname, town, and logo for each linked school.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Your schools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {mine.map(({ school }) => (
            <div
              key={school.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
            >
              <div>
                <div className="font-medium">{school.displayName}</div>
                <div className="text-xs text-muted-foreground">{school.officialName}</div>
              </div>
              <LinkButton variant="secondary" size="sm" href={`/school-admin/school/${school.id}`}>
                Edit
              </LinkButton>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
