import { NextResponse, type NextRequest } from "next/server";
import { requireRole } from "@/lib/auth";
import { adminListResultsForExport, type AdminResultListFilters } from "@/lib/data/admin";
import { parseSportQueryParam } from "@/lib/sports";
import { parseTabularFormat, rowsToCsv, rowsToXlsxBuffer } from "@/lib/tabular";

function qp(req: NextRequest, key: string): string | undefined {
  const v = req.nextUrl.searchParams.get(key);
  const t = v?.trim();
  return t || undefined;
}

export async function GET(req: NextRequest) {
  await requireRole(["ADMIN"]);

  const sport = parseSportQueryParam(req.nextUrl.searchParams.get("sport"));
  const teamId = qp(req, "teamId");
  const search = qp(req, "q");
  const dateFrom = qp(req, "dateFrom");
  const dateTo = qp(req, "dateTo");
  const schoolId = qp(req, "schoolId");

  const filters: AdminResultListFilters = {
    search,
    teamId,
    sport,
    dateFrom,
    dateTo,
    scopeSchoolIds: schoolId ? [schoolId] : undefined,
  };

  const rows = await adminListResultsForExport(filters);

  const format = parseTabularFormat(req.nextUrl.searchParams.get("format"));
  const headers = [
    "result_id",
    "fixture_id",
    "match_date",
    "home_score",
    "away_score",
    "verified",
    "verification_level",
    "published_at",
    "venue",
    "recording_url",
    "home_school",
    "away_school",
    "competition",
    "season",
    "province",
  ];
  const data = rows.map((r) => ({
    result_id: r.resultId,
    fixture_id: r.fixtureId,
    match_date: r.matchDate,
    home_score: r.homeScore,
    away_score: r.awayScore,
    verified: r.isVerified,
    verification_level: r.verificationLevel,
    published_at:
      r.publishedAt instanceof Date ? r.publishedAt.toISOString() : r.publishedAt ?? "",
    venue: r.venue ?? "",
    recording_url: r.recordingUrl ?? "",
    home_school: r.homeSchoolName,
    away_school: r.awaySchoolName,
    competition: r.competitionName ?? "",
    season: r.seasonName ?? "",
    province: r.provinceName ?? "",
  }));

  if (format === "xlsx") {
    const body = rowsToXlsxBuffer(headers, data, "results");
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="results.xlsx"',
      },
    });
  }

  return new NextResponse(rowsToCsv(headers, data), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="results.csv"',
    },
  });
}
