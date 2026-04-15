import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { teams } from "@/db/schema";
import { getProfile } from "@/lib/auth";
import { listResultsForSchoolAdminExport } from "@/lib/data/school-admin-export";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { parseSportQueryParam } from "@/lib/sports";
import { parseTabularFormat, rowsToCsv, rowsToXlsxBuffer } from "@/lib/tabular";

export async function GET(req: NextRequest) {
  const profile = await getProfile();
  if (!profile || profile.role !== "SCHOOL_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const managed = await getActiveManagedSchoolIds(profile.id);
  if (managed.length === 0) {
    return NextResponse.json({ error: "No linked schools." }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const schoolId = sp.get("schoolId");
  const teamId = sp.get("teamId");
  const sport = parseSportQueryParam(sp.get("sport"));
  const search = sp.get("q")?.trim() || null;
  const dateFrom = sp.get("dateFrom")?.trim() || null;
  const dateTo = sp.get("dateTo")?.trim() || null;
  const verifiedOnly = sp.get("verifiedOnly") === "1" || sp.get("verifiedOnly") === "true";
  const format = parseTabularFormat(sp.get("format"));

  if (schoolId && !managed.includes(schoolId)) {
    return NextResponse.json({ error: "Invalid school selection." }, { status: 400 });
  }

  if (teamId) {
    const [t] = await db
      .select({ schoolId: teams.schoolId })
      .from(teams)
      .where(eq(teams.id, teamId))
      .limit(1);
    if (!t || !managed.includes(t.schoolId)) {
      return NextResponse.json({ error: "Invalid team selection." }, { status: 400 });
    }
    if (schoolId && t.schoolId !== schoolId) {
      return NextResponse.json({ error: "Team does not belong to the selected school." }, { status: 400 });
    }
  }

  const rows = await listResultsForSchoolAdminExport({
    scopeSchoolIds: managed,
    schoolId: schoolId || null,
    teamId: teamId || null,
    sport: sport ?? null,
    search: search && search.length >= 2 ? search : null,
    dateFrom: dateFrom || null,
    dateTo: dateTo || null,
    verifiedOnly,
    limit: 5000,
  });

  const headers = [
    "match_date",
    "sport",
    "home_school",
    "away_school",
    "home_score",
    "away_score",
    "competition",
    "season",
    "province",
    "venue",
    "verified",
    "verification_level",
    "published_at",
  ];
  const data = rows.map((r) => ({
    match_date: r.matchDate,
    sport: r.sport,
    home_school: r.homeSchoolName,
    away_school: r.awaySchoolName,
    home_score: r.homeScore,
    away_score: r.awayScore,
    competition: r.competitionName,
    season: r.seasonName,
    province: r.provinceName,
    venue: r.venue,
    verified: r.isVerified,
    verification_level: r.verificationLevel,
    published_at: r.publishedAt instanceof Date ? r.publishedAt.toISOString() : r.publishedAt,
  }));

  if (format === "xlsx") {
    const body = rowsToXlsxBuffer(headers, data, "results");
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "content-type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": 'attachment; filename="school-results-export.xlsx"',
      },
    });
  }

  return new NextResponse(rowsToCsv(headers, data), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="school-results-export.csv"',
    },
  });
}
