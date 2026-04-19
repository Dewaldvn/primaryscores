import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { teams } from "@/db/schema";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { parseSportQueryParam } from "@/lib/sports";
import { parseTeamGenderQueryParam } from "@/lib/team-gender";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json([]);
  }
  const schoolId = req.nextUrl.searchParams.get("schoolId")?.trim() ?? "";
  if (!/^[0-9a-f-]{36}$/i.test(schoolId)) {
    return NextResponse.json([], { status: 400 });
  }

  const sport = parseSportQueryParam(req.nextUrl.searchParams.get("sport"));
  const gender = parseTeamGenderQueryParam(req.nextUrl.searchParams.get("gender"));
  try {
    const rows = await db
      .select({
        id: teams.id,
        sport: teams.sport,
        ageGroup: teams.ageGroup,
        teamLabel: teams.teamLabel,
        gender: teams.gender,
      })
      .from(teams)
      .where(
        and(
          eq(teams.schoolId, schoolId),
          eq(teams.active, true),
          ...(sport ? [eq(teams.sport, sport)] : []),
          ...(sport === "HOCKEY" && gender ? [eq(teams.gender, gender)] : [])
        )
      )
      .orderBy(asc(teams.sport), asc(teams.ageGroup), asc(teams.gender), asc(teams.teamLabel))
      .limit(200);

    return NextResponse.json(
      rows.map((r) => ({
        id: r.id,
        label: `${r.sport} ${r.ageGroup} ${r.teamLabel}${r.gender ? ` ${r.gender}` : ""}`,
        sport: r.sport,
        gender: r.gender,
      }))
    );
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
