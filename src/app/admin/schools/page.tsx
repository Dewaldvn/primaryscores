import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { AdminSchoolForm } from "@/components/admin-school-form";
import { AdminSchoolsDirectorySearch } from "@/components/admin-schools-directory-search";
import { AdminNavTableRow, AdminRowNavLink } from "@/components/admin-nav-table-row";
import { SchoolLogo } from "@/components/school-logo";
import { adminListSchools } from "@/lib/data/admin";
import { listProvinces } from "@/lib/data/schools";
import { adminDirectoryZebraTableRowClass } from "@/lib/admin-directory-style";
import { isDatabaseConfigured } from "@/lib/db-safe";

type PageProps = { searchParams: Record<string, string | string[] | undefined> };
const SCHOOLS_PAGE_SIZE = 15;

function qp(sp: PageProps["searchParams"], key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

export default async function AdminSchoolsPage({ searchParams }: PageProps) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const schoolSearch = qp(searchParams, "q");
  const requestedLoaded = Number.parseInt(qp(searchParams, "loaded"), 10);
  const loadedCount =
    Number.isFinite(requestedLoaded) && requestedLoaded > 0 ? Math.min(requestedLoaded, 300) : SCHOOLS_PAGE_SIZE;
  const [rows, provinces] = await Promise.all([
    adminListSchools({
      search: schoolSearch || undefined,
      latestFirst: false,
      limit: loadedCount + 1,
    }),
    listProvinces(),
  ]);
  const hasMore = rows.length > loadedCount;
  const visibleRows = hasMore ? rows.slice(0, loadedCount) : rows;
  const newSchoolDisplay = qp(searchParams, "newSchoolDisplay");
  const prefillNew =
    newSchoolDisplay.length > 0
      ? { displayName: newSchoolDisplay, officialName: newSchoolDisplay }
      : undefined;

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Schools</h1>
        <Link href="/admin/school-admins" className="inline-block text-sm text-muted-foreground hover:underline">
          ← Back to school admins
        </Link>
        <p className="text-sm text-muted-foreground">
          Create and edit schools. Directory shows the latest {loadedCount} added schools
          {schoolSearch ? " matching search" : ""}.
        </p>
        <a
          href="#add-school"
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            "inline-flex w-fit",
          )}
        >
          Add school
        </a>
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
              {visibleRows.map((r, i) => (
                <AdminNavTableRow
                  key={r.school.id}
                  href={`/admin/schools/${r.school.id}`}
                  className={adminDirectoryZebraTableRowClass(i)}
                >
                  <TableCell>
                    <SchoolLogo logoPath={r.school.logoPath} alt="" size="xs" />
                  </TableCell>
                  <TableCell className="font-medium">{r.school.displayName}</TableCell>
                  <TableCell>{r.provinceName}</TableCell>
                  <TableCell>{r.school.town}</TableCell>
                  <TableCell className="font-mono text-xs">{r.school.slug}</TableCell>
                  <TableCell className="space-x-3 whitespace-nowrap">
                    <AdminRowNavLink
                      href={`/admin/schools/${r.school.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Edit
                    </AdminRowNavLink>
                    <AdminRowNavLink
                      href={`/schools/${r.school.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Public
                    </AdminRowNavLink>
                  </TableCell>
                </AdminNavTableRow>
              ))}
              {visibleRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                    No schools found.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
          {hasMore ? (
            <Link
              href={{
                pathname: "/admin/schools",
                query: {
                  ...(schoolSearch ? { q: schoolSearch } : {}),
                  ...(newSchoolDisplay ? { newSchoolDisplay } : {}),
                  loaded: String(loadedCount + SCHOOLS_PAGE_SIZE),
                },
              }}
              className="inline-block text-sm text-primary hover:underline"
            >
              Load more...
            </Link>
          ) : null}
        </CardContent>
      </Card>

      <Card id="add-school" className="scroll-mt-24">
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
