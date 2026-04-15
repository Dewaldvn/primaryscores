import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { parseTabularFormat, rowsToCsv, rowsToXlsxBuffer } from "@/lib/tabular";

export async function GET(req: NextRequest) {
  await requireRole(["ADMIN"]);
  const format = parseTabularFormat(req.nextUrl.searchParams.get("format"));

  const headers = [
    "match_date",
    "home_school_official_name",
    "home_school_slug",
    "away_school_official_name",
    "away_school_slug",
    "home_score",
    "away_score",
    "venue",
    "season_id",
    "competition_id",
    "is_verified",
    "verification_level",
  ];
  const rows = [
    {
      match_date: "2026-04-06",
      home_school_official_name: "Some Primary School",
      home_school_slug: "some-school-slug",
      away_school_official_name: "Another Primary School",
      away_school_slug: "another-school-slug",
      home_score: 18,
      away_score: 12,
      venue: "Main field",
      season_id: "",
      competition_id: "",
      is_verified: true,
      verification_level: "MODERATOR_VERIFIED",
    },
  ];

  if (format === "xlsx") {
    const body = rowsToXlsxBuffer(headers, rows, "results-template");
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="results-import-template.xlsx"',
      },
    });
  }

  return new NextResponse(rowsToCsv(headers, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="results-import-template.csv"',
    },
  });
}

