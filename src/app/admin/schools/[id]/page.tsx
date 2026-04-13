import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSchoolForm } from "@/components/admin-school-form";
import { AdminSchoolLogoPanel } from "@/components/admin-school-logo-panel";
import { adminGetSchoolById } from "@/lib/data/admin";
import { listProvinces } from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";

type Props = { params: { id: string } };

export default async function AdminEditSchoolPage({ params }: Props) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const [row, provinces] = await Promise.all([adminGetSchoolById(params.id), listProvinces()]);
  if (!row) notFound();

  const s = row.school;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/schools" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
          ← Schools directory
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold">Edit school</h1>
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
          <AdminSchoolForm
            provinces={provinces}
            initial={{
              id: s.id,
              officialName: s.officialName,
              displayName: s.displayName,
              nickname: s.nickname ?? null,
              slug: s.slug,
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
