import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { teams } from "@/db/schema";
import { getProfile } from "@/lib/auth";
import { listResultsForSchoolAdminExport } from "@/lib/data/school-admin-export";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { parseSportQueryParam } from "@/lib/sports";

function csvCell(v: string | number | boolean | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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

  const header = [
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
  ].join(",");

  const lines = rows.map((r) =>
    [
      csvCell(r.matchDate),
      csvCell(r.sport),
      csvCell(r.homeSchoolName),
      csvCell(r.awaySchoolName),
      csvCell(r.homeScore),
      csvCell(r.awayScore),
      csvCell(r.competitionName),
      csvCell(r.seasonName),
      csvCell(r.provinceName),
      csvCell(r.venue),
      csvCell(r.isVerified),
      csvCell(r.verificationLevel),
      csvCell(r.publishedAt instanceof Date ? r.publishedAt.toISOString() : r.publishedAt),
    ].join(",")
  );

  const body = `\uFEFF${[header, ...lines].join("\r\n")}`;
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="school-results-export.csv"',
    },
  });
}
