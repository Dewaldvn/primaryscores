import { NextRequest, NextResponse } from "next/server";
import { runGlobalSearch } from "@/lib/data/global-search";
import { isDatabaseConfigured } from "@/lib/db-safe";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      schools: [],
      competitions: [],
      seasons: [],
      matchedProvinces: [],
      provinceGames: [],
    });
  }
  const q = req.nextUrl.searchParams.get("q") ?? "";
  try {
    const data = await runGlobalSearch(q);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      {
        schools: [],
        competitions: [],
        seasons: [],
        matchedProvinces: [],
        provinceGames: [],
      },
      { status: 500 }
    );
  }
}
