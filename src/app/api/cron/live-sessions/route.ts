import { NextRequest, NextResponse } from "next/server";
import { processLiveSessionDeadlines } from "@/lib/data/live-sessions";
import { isDatabaseConfigured } from "@/lib/db-safe";

export const dynamic = "force-dynamic";

/**
 * Call on a schedule (e.g. Vercel Cron every 5m) so wrap-up auto-submits even without traffic.
 * Set CRON_SECRET in env and send: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: "CRON_SECRET not configured" }, { status: 501 });
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false, error: "Database not configured" }, { status: 503 });
  }
  await processLiveSessionDeadlines();
  return NextResponse.json({ ok: true });
}
