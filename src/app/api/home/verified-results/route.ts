import { NextRequest, NextResponse } from "next/server";
import { listRecentVerifiedResultsPaged } from "@/lib/data/results";
import { isDatabaseConfigured } from "@/lib/db-safe";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 8;
const MAX_LIMIT = 50;
const MAX_OFFSET = 500;

/** Paginated verified results for the home page (publishedAt descending). */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ rows: [] });
  }
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const offsetRaw = req.nextUrl.searchParams.get("offset");
  const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : DEFAULT_LIMIT;
  const offsetParsed = offsetRaw ? Number.parseInt(offsetRaw, 10) : 0;
  const limit = Number.isFinite(limitParsed) ? limitParsed : DEFAULT_LIMIT;
  const offset = Number.isFinite(offsetParsed) ? offsetParsed : 0;

  try {
    const rows = await listRecentVerifiedResultsPaged(
      Math.min(Math.max(0, offset), MAX_OFFSET),
      Math.min(Math.max(1, limit), MAX_LIMIT)
    );
    return NextResponse.json(
      { rows },
      {
        headers: {
          "Cache-Control": "no-store, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json({ rows: [], error: "failed" }, { status: 500 });
  }
}
