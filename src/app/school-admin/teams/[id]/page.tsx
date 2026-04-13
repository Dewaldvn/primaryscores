import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminTeamForm } from "@/components/admin-team-form";
import { TeamDeleteButton } from "@/components/team-delete-button";
import { getProfile } from "@/lib/auth";
import { adminGetTeamById, adminListSchools } from "@/lib/data/admin";
import { listProfilesLinkedToTeam } from "@/lib/data/school-admin-team-users";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { SchoolAdminTeamLinkedUsers } from "@/components/school-admin-team-linked-users";
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
  const [row, schoolRows, linkedProfiles] = await Promise.all([
    adminGetTeamById(params.id),
    adminListSchools(),
    listProfilesLinkedToTeam(params.id),
  ]);
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
              teamNickname: t.teamNickname ?? null,
              active: t.active,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users linked to this team</CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolAdminTeamLinkedUsers teamId={t.id} initialRows={linkedProfiles} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Permanently remove this team. If it is already used in fixtures or results, deletion will be blocked.
          </p>
          <TeamDeleteButton teamId={t.id} returnHref="/school-admin/teams" />
        </CardContent>
      </Card>
    </div>
  );
}
