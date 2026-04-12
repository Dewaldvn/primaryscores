import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTeamForm } from "@/components/admin-team-form";
import { getProfile } from "@/lib/auth";
import { adminGetSchoolById } from "@/lib/data/admin";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { isDatabaseConfigured } from "@/lib/db-safe";

type Props = { searchParams: Record<string, string | string[] | undefined> };

export default async function SchoolAdminNewTeamPage({ searchParams }: Props) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const profile = await getProfile();
  if (!profile || profile.role !== "SCHOOL_ADMIN") {
    redirect("/login");
  }

  const raw = searchParams.schoolId;
  const schoolId = typeof raw === "string" ? raw : Array.isArray(raw) ? raw[0] : undefined;
  if (!schoolId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Add team</h1>
        <p className="text-sm text-muted-foreground">
          Choose a school from the{" "}
          <Link href="/school-admin/teams" className="text-primary underline">
            teams
          </Link>{" "}
          page (use &quot;New team&quot; for the right school).
        </p>
      </div>
    );
  }

  const managed = await getActiveManagedSchoolIds(profile.id);
  if (!managed.includes(schoolId)) notFound();

  const row = await adminGetSchoolById(schoolId);
  if (!row) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/school-admin/teams" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← Teams
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Add team</h1>
        <p className="text-sm text-muted-foreground">{row.school.displayName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminTeamForm
            schools={[{ id: row.school.id, label: row.school.displayName }]}
            fixedSchoolId={row.school.id}
            lockSchoolSelect
          />
        </CardContent>
      </Card>
    </div>
  );
}
