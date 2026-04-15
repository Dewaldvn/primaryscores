import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseTabularFormat, rowsToCsv, rowsToXlsxBuffer } from "@/lib/tabular";

export async function GET(req: NextRequest) {
  await requireRole(["ADMIN"]);
  const format = parseTabularFormat(req.nextUrl.searchParams.get("format"));

  const headers = [
    "official_name",
    "display_name",
    "nickname",
    "slug",
    "province_code",
    "province_name",
    "province_id",
    "town",
    "website",
    "active",
    "logo_url",
  ];
  const rows = [
    {
      official_name: "Example Primary School",
      display_name: "Example Primary",
      nickname: "EPS",
      slug: "example-primary-school",
      province_code: "WC",
      province_name: "Western Cape",
      province_id: "",
      town: "Cape Town",
      website: "https://example.edu.za",
      active: true,
      logo_url: "https://example.edu.za/static/logo.png",
    },
  ];

  if (format === "xlsx") {
    const body = rowsToXlsxBuffer(headers, rows, "schools-template");
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="schools-import-template.xlsx"',
      },
    });
  }

  return new NextResponse(rowsToCsv(headers, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="schools-import-template.csv"',
    },
  });
}
