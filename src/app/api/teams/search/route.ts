import { NextRequest, NextResponse } from "next/server";
import { and, eq, ilike, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, teams } from "@/db/schema";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { schoolsHasNicknameColumn } from "@/lib/school-db-support";
import { parseSportQueryParam } from "@/lib/sports";
import { parseTeamGenderQueryParam } from "@/lib/team-gender";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json([]);
  }
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  const sport = parseSportQueryParam(req.nextUrl.searchParams.get("sport"));
  const gender = parseTeamGenderQueryParam(req.nextUrl.searchParams.get("gender"));
  if (q.length < 2) {
    return NextResponse.json([]);
  }
  const like = `%${q.replace(/[%_\\]/g, "")}%`;
  try {
    const includeNickname = await schoolsHasNicknameColumn();
    const schoolMatch = includeNickname
      ? or(
          ilike(schools.displayName, like),
          ilike(schools.officialName, like),
          ilike(schools.nickname, like),
        )
      : or(ilike(schools.displayName, like), ilike(schools.officialName, like));
    const rows = await db
      .select({
        id: teams.id,
        schoolId: schools.id,
        schoolName: schools.displayName,
        schoolLogoPath: schools.logoPath,
        sport: teams.sport,
        ageGroup: teams.ageGroup,
        teamLabel: teams.teamLabel,
        gender: teams.gender,
      })
      .from(teams)
      .innerJoin(schools, eq(teams.schoolId, schools.id))
      .where(
        and(
          eq(teams.active, true),
          eq(schools.active, true),
          ...(sport ? [eq(teams.sport, sport)] : []),
          ...(sport === "HOCKEY" && gender ? [eq(teams.gender, gender)] : []),
          or(
            schoolMatch!,
            ilike(teams.teamLabel, like),
            ilike(teams.ageGroup, like),
          )!,
        ),
      )
      .orderBy(schools.displayName, teams.sport, teams.ageGroup)
      .limit(25);

    const payload = rows.map((r) => ({
      id: r.id,
      schoolId: r.schoolId,
      schoolName: r.schoolName,
      schoolLogoPath: r.schoolLogoPath,
      label: `${r.schoolName} · ${r.sport} ${r.ageGroup} ${r.teamLabel}${r.gender ? ` ${r.gender}` : ""}`,
    }));
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
