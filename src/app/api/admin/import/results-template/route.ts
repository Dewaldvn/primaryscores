import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";

export async function GET() {
  await requireRole(["ADMIN"]);

  const lines = [
    [
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
    ].join(","),
    [
      "2026-04-06",
      JSON.stringify("Some Primary School"),
      "some-school-slug",
      JSON.stringify("Another Primary School"),
      "another-school-slug",
      "18",
      "12",
      JSON.stringify("Main field"),
      "",
      "",
      "true",
      "MODERATOR_VERIFIED",
    ].join(","),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="results-import-template.csv"',
    },
  });
}

