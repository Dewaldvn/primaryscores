import { NextRequest, NextResponse } from "next/server";
import { listUnderwayLiveSessions } from "@/lib/data/live-sessions";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { parseSportQueryParam } from "@/lib/sports";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

/** Public JSON for live scoreboard UI (client polls every ~15s). */
export async function GET(req: NextRequest) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ sessions: [] });
  }
  const q = req.nextUrl.searchParams.get("q") ?? undefined;
  const sport = parseSportQueryParam(req.nextUrl.searchParams.get("sport"));
  const limitRaw = req.nextUrl.searchParams.get("limit");
  const limitParsed = limitRaw ? Number.parseInt(limitRaw, 10) : DEFAULT_LIMIT;
  const limit = Number.isFinite(limitParsed) ? limitParsed : DEFAULT_LIMIT;

  try {
    const sessions = await listUnderwayLiveSessions({
      q: q?.trim() || undefined,
      sport,
      limit: Math.min(Math.max(1, limit), MAX_LIMIT),
    });
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [], error: "failed" }, { status: 500 });
  }
}
