import { NextResponse } from "next/server";
import { listUnderwayLiveSessions } from "@/lib/data/live-sessions";
import { isDatabaseConfigured } from "@/lib/db-safe";

export const dynamic = "force-dynamic";

/** Public JSON for live scoreboard UI (client polls every ~15s). */
export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ sessions: [] });
  }
  try {
    const sessions = await listUnderwayLiveSessions();
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json({ sessions: [], error: "failed" }, { status: 500 });
  }
}
