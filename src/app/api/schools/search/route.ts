import { NextRequest, NextResponse } from "next/server";
import { searchSchools } from "@/lib/data/schools";
import { ensureU13TeamsForSchoolsMissingThem } from "@/lib/data/team-bootstrap";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { parseSportQueryParam } from "@/lib/sports";
import { parseTeamGenderQueryParam } from "@/lib/team-gender";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json([]);
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const sport = parseSportQueryParam(req.nextUrl.searchParams.get("sport"));
  const gender = parseTeamGenderQueryParam(req.nextUrl.searchParams.get("gender"));
  try {
    await ensureU13TeamsForSchoolsMissingThem();
    const rows = await searchSchools(
      q,
      25,
      sport ? { sport, ...(gender ? { gender } : {}) } : undefined
    );
    return NextResponse.json(rows);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
