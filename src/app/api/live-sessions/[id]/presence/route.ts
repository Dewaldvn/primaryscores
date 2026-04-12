import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { parseViewerKey, touchLiveSessionPresence } from "@/lib/data/live-session-presence";
import { isDatabaseConfigured } from "@/lib/db-safe";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
  const sessionId = params.id;
  if (!UUID_RE.test(sessionId)) {
    return NextResponse.json({ ok: false, error: "bad_session" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }
  const viewerKey = typeof body === "object" && body !== null && "viewerKey" in body ? String((body as { viewerKey?: unknown }).viewerKey ?? "") : "";
  const parsed = parseViewerKey(viewerKey);
  if (!parsed) {
    return NextResponse.json({ ok: false, error: "invalid_viewer_key" }, { status: 400 });
  }

  const user = await getSessionUser();
  if (parsed.kind === "user") {
    if (!user || user.id.toLowerCase() !== parsed.id.toLowerCase()) {
      return NextResponse.json({ ok: false, error: "auth" }, { status: 403 });
    }
  }

  const ok = await touchLiveSessionPresence(sessionId, viewerKey.trim());
  if (!ok) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
