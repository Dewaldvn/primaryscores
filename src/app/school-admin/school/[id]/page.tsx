import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSchoolForm } from "@/components/admin-school-form";
import { AdminSchoolLogoPanel } from "@/components/admin-school-logo-panel";
import { getProfile } from "@/lib/auth";
import { adminGetSchoolById } from "@/lib/data/admin";
import { listProvinces } from "@/lib/data/schools";
import { profileManagesSchool } from "@/lib/school-admin-access";
import { isDatabaseConfigured } from "@/lib/db-safe";

type Props = { params: { id: string } };

export default async function SchoolAdminEditSchoolPage({ params }: Props) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const profile = await getProfile();
  if (!profile || profile.role !== "SCHOOL_ADMIN") {
    redirect("/login");
  }

  const ok = await profileManagesSchool(profile.id, params.id);
  if (!ok) notFound();

  const [row, provinces] = await Promise.all([adminGetSchoolById(params.id), listProvinces()]);
  if (!row) notFound();

  const s = row.school;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/school-admin" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← School admin
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">School details</h1>
        <p className="text-sm text-muted-foreground">{s.displayName}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminSchoolLogoPanel schoolId={s.id} displayName={s.displayName} logoPath={s.logoPath} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-sm text-muted-foreground">
            URL slug and active status are managed by site administrators. You can update
            province, names, town, and website.
          </p>
          <AdminSchoolForm
            provinces={provinces}
            schoolAdminMode
            initial={{
              id: s.id,
              officialName: s.officialName,
              displayName: s.displayName,
              nickname: s.nickname ?? null,
              slug: s.slug,
              schoolType: s.schoolType,
              provinceId: s.provinceId,
              town: s.town,
              website: s.website,
              active: s.active,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
