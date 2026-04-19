import { NextRequest, NextResponse } from "next/server";
import { listScheduledLiveSessions } from "@/lib/data/live-sessions";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { parseSportQueryParam } from "@/lib/sports";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 50;
const MAX_OFFSET = 500;

/** Public JSON for scheduled (future go-live) scoreboards — supports offset pagination. */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ sessions: [] });
  }
  const sport = parseSportQueryParam(req.nextUrl.searchParams.get("sport"));
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const offsetRaw = req.nextUrl.searchParams.get("offset");
  const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : DEFAULT_LIMIT;
  const offsetParsed = offsetRaw ? Number.parseInt(offsetRaw, 10) : 0;
  const limit = Number.isFinite(limitParsed) ? limitParsed : DEFAULT_LIMIT;
  const offset = Number.isFinite(offsetParsed) ? offsetParsed : 0;

  try {
    const sessions = await listScheduledLiveSessions({
      sport,
      limit: Math.min(Math.max(1, limit), MAX_LIMIT),
      offset: Math.min(Math.max(0, offset), MAX_OFFSET),
    });
    return NextResponse.json(
      { sessions },
      {
        headers: {
          "Cache-Control": "no-store, must-revalidate",
        },
      }
    );
  } catch {
    return NextResponse.json({ sessions: [], error: "failed" }, { status: 500 });
  }
}
