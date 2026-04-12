import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTeamForm } from "@/components/admin-team-form";
import { getProfile } from "@/lib/auth";
import { adminGetTeamById, adminListSchools } from "@/lib/data/admin";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { isDatabaseConfigured } from "@/lib/db-safe";
import type { SchoolSport } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";

type Props = { params: { id: string } };

export default async function SchoolAdminEditTeamPage({ params }: Props) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const profile = await getProfile();
  if (!profile || profile.role !== "SCHOOL_ADMIN") {
    redirect("/login");
  }

  const managed = await getActiveManagedSchoolIds(profile.id);
  const [row, schoolRows] = await Promise.all([adminGetTeamById(params.id), adminListSchools()]);
  if (!row) notFound();
  if (!managed.includes(row.team.schoolId)) notFound();

  const schools = schoolRows
    .filter((r) => managed.includes(r.school.id))
    .map((r) => ({ id: r.school.id, label: r.school.displayName }));

  const t = row.team;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/school-admin/teams" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← Teams
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Edit team</h1>
        <p className="text-sm text-muted-foreground">
          {row.schoolName} · {t.sport} · {t.ageGroup} {t.teamLabel}
          {t.gender ? ` · ${t.gender}` : ""}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminTeamForm
            schools={schools}
            lockSchoolSelect
            initial={{
              id: t.id,
              schoolId: t.schoolId,
              sport: t.sport as SchoolSport,
              gender: (t.gender ?? null) as TeamGender | null,
              ageGroup: t.ageGroup,
              teamLabel: t.teamLabel,
              isFirstTeam: t.isFirstTeam,
              active: t.active,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
