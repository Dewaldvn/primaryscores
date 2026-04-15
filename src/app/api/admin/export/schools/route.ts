import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { adminListSchools } from "@/lib/data/admin";
import { parseTabularFormat, rowsToCsv, rowsToXlsxBuffer } from "@/lib/tabular";

export async function GET(req: NextRequest) {
  await requireRole(["ADMIN"]);
  const rows = await adminListSchools();
  const format = parseTabularFormat(req.nextUrl.searchParams.get("format"));
  const headers = ["id", "slug", "display_name", "official_name", "province", "active", "town"];
  const data = rows.map((r) => ({
    id: r.school.id,
    slug: r.school.slug,
    display_name: r.school.displayName,
    official_name: r.school.officialName,
    province: r.provinceName,
    active: r.school.active,
    town: r.school.town ?? "",
  }));

  if (format === "xlsx") {
    const body = rowsToXlsxBuffer(headers, data, "schools");
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="schools.xlsx"',
      },
    });
  }

  return new NextResponse(rowsToCsv(headers, data), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="schools.csv"',
    },
  });
}
