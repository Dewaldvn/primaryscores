import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminSchoolForm } from "@/components/admin-school-form";
import { AdminSchoolsDirectorySearch } from "@/components/admin-schools-directory-search";
import { SchoolLogo } from "@/components/school-logo";
import { adminListSchools } from "@/lib/data/admin";
import { ensureU13TeamsForSchoolsMissingThem } from "@/lib/data/team-bootstrap";
import { listProvinces } from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";

type PageProps = { searchParams: Record<string, string | string[] | undefined> };

function qp(sp: PageProps["searchParams"], key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export default async function AdminSchoolsPage({ searchParams }: PageProps) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  await ensureU13TeamsForSchoolsMissingThem();
  const schoolSearch = qp(searchParams, "q");
  const [rows, provinces] = await Promise.all([
    adminListSchools({
      search: schoolSearch || undefined,
      latestFirst: true,
      limit: 15,
    }),
    listProvinces(),
  ]);
  const newSchoolDisplay = qp(searchParams, "newSchoolDisplay");
  const prefillNew =
    newSchoolDisplay.length > 0
      ? { displayName: newSchoolDisplay, officialName: newSchoolDisplay }
      : undefined;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Schools</h1>
        <p className="text-sm text-muted-foreground">
          Create and edit schools. Directory shows the latest 15 added schools{schoolSearch ? " matching search" : ""}.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 overflow-x-auto">
          <AdminSchoolsDirectorySearch initialValue={schoolSearch} />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Logo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Province</TableHead>
                <TableHead>Town</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.school.id}>
                  <TableCell>
                    <SchoolLogo logoPath={r.school.logoPath} alt="" size="xs" />
                  </TableCell>
                  <TableCell className="font-medium">{r.school.displayName}</TableCell>
                  <TableCell>{r.provinceName}</TableCell>
                  <TableCell>{r.school.town}</TableCell>
                  <TableCell className="font-mono text-xs">{r.school.slug}</TableCell>
                  <TableCell className="space-x-3 whitespace-nowrap">
                    <Link
                      href={`/admin/schools/${r.school.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <Link
                      href={`/schools/${r.school.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Public
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No schools found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add school</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminSchoolForm key={newSchoolDisplay || "new"} provinces={provinces} prefillNew={prefillNew} />
        </CardContent>
      </Card>
    </div>
  );
}
