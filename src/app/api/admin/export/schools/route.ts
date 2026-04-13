import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { adminListSchools } from "@/lib/data/admin";

export async function GET() {
  await requireRole(["ADMIN"]);
  const rows = await adminListSchools();

  const lines = [
    ["id", "slug", "display_name", "official_name", "province", "active", "town"].join(
      ","
    ),
    ...rows.map((r) =>
      [
        r.school.id,
        r.school.slug,
        JSON.stringify(r.school.displayName),
        JSON.stringify(r.school.officialName),
        JSON.stringify(r.provinceName),
        r.school.active,
        r.school.town ?? "",
      ].join(",")
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="schools.csv"',
    },
  });
}
