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
import { adminListSchools } from "@/lib/data/admin";
import { listProvinces } from "@/lib/data/schools";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function AdminSchoolsPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const [rows, provinces] = await Promise.all([adminListSchools(), listProvinces()]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Schools</h1>
        <p className="text-sm text-muted-foreground">Create and edit primary schools.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Directory</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
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
                  <TableCell className="font-medium">{r.school.displayName}</TableCell>
                  <TableCell>{r.provinceName}</TableCell>
                  <TableCell>{r.school.town}</TableCell>
                  <TableCell className="font-mono text-xs">{r.school.slug}</TableCell>
                  <TableCell>
                    <Link
                      href={`/schools/${r.school.slug}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Public page
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add school</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminSchoolForm provinces={provinces} />
        </CardContent>
      </Card>
    </div>
  );
}
