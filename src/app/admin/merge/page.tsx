import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  adminGetSchoolById,
  adminListTeamsForSchoolIds,
  adminSearchSchoolsForMerge,
} from "@/lib/data/admin";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { AdminSchoolMergeForm } from "@/components/admin-school-merge-form";
import { AdminMergeSchoolSearch } from "@/components/admin-merge-school-search";

type Props = { searchParams: Record<string, string | string[] | undefined> };

function qp(sp: Props["searchParams"], key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function isUuid(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

function mergeUrl(baseQ: string, sourceId: string | undefined, targetId: string | undefined): string {
  const u = new URLSearchParams();
  if (baseQ.trim()) u.set("q", baseQ.trim());
  if (sourceId) u.set("source", sourceId);
  if (targetId) u.set("target", targetId);
  const qs = u.toString();
  return qs ? `/admin/merge?${qs}` : "/admin/merge";
}

export default async function AdminMergePage({ searchParams }: Props) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const q = qp(searchParams, "q");
  const sourceIdRaw = qp(searchParams, "source");
  const targetIdRaw = qp(searchParams, "target");
  const sourceId = isUuid(sourceIdRaw) ? sourceIdRaw : "";
  const targetId = isUuid(targetIdRaw) ? targetIdRaw : "";

  const [candidates, sourceRow, targetRow, teamRows] = await Promise.all([
    q.length >= 2 ? adminSearchSchoolsForMerge(q) : Promise.resolve([]),
    sourceId ? adminGetSchoolById(sourceId) : Promise.resolve(null),
    targetId ? adminGetSchoolById(targetId) : Promise.resolve(null),
    sourceId || targetId
      ? adminListTeamsForSchoolIds([sourceId, targetId].filter(Boolean))
      : Promise.resolve([]),
  ]);

  const sourceTeams = sourceRow ? teamRows.filter((r) => r.schoolId === sourceRow.school.id).map((r) => r.team) : [];
  const targetTeams = targetRow ? teamRows.filter((r) => r.schoolId === targetRow.school.id).map((r) => r.team) : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Merge schools</h1>
        <p className="text-sm text-muted-foreground">
          Find similar school records, compare side by side, and choose which fields and teams to merge.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Find possible duplicates</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminMergeSchoolSearch initialValue={q} />

          {candidates.length > 0 ? (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left">School</th>
                    <th className="px-3 py-2 text-left">Nickname</th>
                    <th className="px-3 py-2 text-left">Town</th>
                    <th className="px-3 py-2 text-left">Slug</th>
                    <th className="px-3 py-2 text-left">Pick</th>
                  </tr>
                </thead>
                <tbody>
                  {candidates.map((row) => (
                    <tr key={row.school.id} className="border-b">
                      <td className="px-3 py-2 font-medium">{row.school.displayName}</td>
                      <td className="px-3 py-2">{row.school.nickname ?? "—"}</td>
                      <td className="px-3 py-2">{row.school.town ?? "—"}</td>
                      <td className="px-3 py-2 font-mono text-xs">{row.school.slug}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <Link href={mergeUrl(q, row.school.id, targetId || undefined)} className="text-primary hover:underline">
                            Set source
                          </Link>
                          <Link href={mergeUrl(q, sourceId || undefined, row.school.id)} className="text-primary hover:underline">
                            Set target
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : q.length >= 2 ? (
            <p className="text-sm text-muted-foreground">No similar schools found.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Type at least 2 characters to search.</p>
          )}
        </CardContent>
      </Card>

      {sourceRow && targetRow ? (
        <Card>
          <CardHeader>
            <CardTitle>Merge selection</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminSchoolMergeForm
              source={sourceRow.school}
              target={targetRow.school}
              sourceProvinceName={sourceRow.provinceName}
              targetProvinceName={targetRow.provinceName}
              sourceTeams={sourceTeams}
              targetTeams={targetTeams}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
