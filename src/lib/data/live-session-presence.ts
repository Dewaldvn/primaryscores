import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveSessionPresence, liveSessions } from "@/db/schema";
import { LIVE_PRESENCE_WINDOW_MINUTES } from "@/lib/live-presence-constants";

const SESSION_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const USER_VIEWER_KEY = /^user:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;
const GUEST_VIEWER_KEY = /^guest:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export function parseViewerKey(viewerKey: string): { kind: "user" | "guest"; id: string } | null {
  const t = viewerKey.trim();
  const um = USER_VIEWER_KEY.exec(t);
  if (um) return { kind: "user", id: um[1] };
  const gm = GUEST_VIEWER_KEY.exec(t);
  if (gm) return { kind: "guest", id: gm[1] };
  return null;
}

export async function getActiveViewerCountsBySessionIds(sessionIds: string[]): Promise<Map<string, number>> {
  const unique = Array.from(new Set(sessionIds)).filter((id) => SESSION_UUID_RE.test(id));
  const out = new Map<string, number>();
  for (const id of unique) out.set(id, 0);
  if (unique.length === 0) return out;

  const rows = await db
    .select({
      sessionId: liveSessionPresence.sessionId,
      n: sql<number>`cast(count(*) as int)`,
    })
    .from(liveSessionPresence)
    .where(
      and(
        inArray(liveSessionPresence.sessionId, unique),
        sql`${liveSessionPresence.lastSeenAt} > now() - interval '1 minute' * ${LIVE_PRESENCE_WINDOW_MINUTES}`
      )
    )
    .groupBy(liveSessionPresence.sessionId);

  for (const r of rows) {
    out.set(r.sessionId, r.n);
  }
  return out;
}

export async function touchLiveSessionPresence(sessionId: string, viewerKey: string): Promise<boolean> {
  if (!SESSION_UUID_RE.test(sessionId)) return false;
  const key = viewerKey.trim();
  if (!parseViewerKey(key)) return false;

  const [open] = await db
    .select({ id: liveSessions.id })
    .from(liveSessions)
    .where(and(eq(liveSessions.id, sessionId), inArray(liveSessions.status, ["ACTIVE", "WRAPUP"])))
    .limit(1);
  if (!open) return false;

  const now = new Date();
  await db
    .insert(liveSessionPresence)
    .values({
      sessionId,
      viewerKey: key,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: [liveSessionPresence.sessionId, liveSessionPresence.viewerKey],
      set: { lastSeenAt: now },
    });

  return true;
}
