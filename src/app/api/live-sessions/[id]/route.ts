import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getUnderwayLiveSessionById, listLiveScoreFeed } from "@/lib/data/live-sessions";
import { getProfileAvatarPublicUrl } from "@/lib/profile-avatar";
import { getSessionUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { isDatabaseConfigured } from "@/lib/db-safe";

export const dynamic = "force-dynamic";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ session: null }, { status: 503 });
  }
  const id = params.id;
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ session: null }, { status: 404 });
  }
  try {
    const session = await getUnderwayLiveSessionById(id);
    if (!session) {
      return NextResponse.json({ session: null }, { status: 404 });
    }
    const [scoreFeed, user] = await Promise.all([listLiveScoreFeed(id), getSessionUser()]);
    let viewer: { displayName: string; avatarUrl: string | null } | null = null;
    if (user) {
      const [p] = await db
        .select({ displayName: profiles.displayName, avatarPath: profiles.avatarPath })
        .from(profiles)
        .where(eq(profiles.id, user.id))
        .limit(1);
      if (p) {
        viewer = {
          displayName: p.displayName,
          avatarUrl: getProfileAvatarPublicUrl(p.avatarPath),
        };
      }
    }
    return NextResponse.json({ session, scoreFeed, viewer });
  } catch {
    return NextResponse.json({ session: null, error: "failed" }, { status: 500 });
  }
}
