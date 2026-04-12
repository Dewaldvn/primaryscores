import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveSessions, liveScoreVotes, profiles } from "@/db/schema";
import { getProfileAvatarPublicUrl } from "@/lib/profile-avatar";
import type { LiveScoreFeedItem } from "@/lib/live-session-types";
import { createLiveSubmissionFromSession } from "@/lib/backend/live-session-wrapup";
import { LIVE_AUTO_SUBMIT_AFTER_MIN, LIVE_WRAPUP_AFTER_MIN } from "@/lib/live-constants";
import { majorityFromVotes, type MajorityResult } from "@/lib/live-majority";
import { getActiveViewerCountsBySessionIds } from "@/lib/data/live-session-presence";

export { LIVE_AUTO_SUBMIT_AFTER_MIN, LIVE_WRAPUP_AFTER_MIN };
export type { MajorityResult };

function minutesSince(start: Date | null, end: Date): number {
  if (!start) return 0;
  return (end.getTime() - start.getTime()) / 60_000;
}

async function loadVotes(sessionId: string) {
  return db
    .select({
      voterKey: liveScoreVotes.voterKey,
      homeScore: liveScoreVotes.homeScore,
      awayScore: liveScoreVotes.awayScore,
      createdAt: liveScoreVotes.createdAt,
    })
    .from(liveScoreVotes)
    .where(eq(liveScoreVotes.sessionId, sessionId))
    .orderBy(desc(liveScoreVotes.createdAt));
}

export async function processLiveSessionDeadlines(now = new Date()): Promise<void> {
  const open = await db
    .select()
    .from(liveSessions)
    .where(inArray(liveSessions.status, ["ACTIVE", "WRAPUP"]));

  for (const s of open) {
    if (!s.firstVoteAt) continue;
    const first = s.firstVoteAt instanceof Date ? s.firstVoteAt : new Date(s.firstVoteAt);
    const minSince = minutesSince(first, now);

    if (s.status === "ACTIVE" && minSince >= LIVE_WRAPUP_AFTER_MIN) {
      await db
        .update(liveSessions)
        .set({
          status: "WRAPUP",
          wrapupStartedAt: s.wrapupStartedAt ?? now,
          updatedAt: now,
        })
        .where(and(eq(liveSessions.id, s.id), eq(liveSessions.status, "ACTIVE")));
    }
  }

  const wrapup = await db
    .select()
    .from(liveSessions)
    .where(and(eq(liveSessions.status, "WRAPUP"), sql`${liveSessions.submissionId} is null`));

  for (const s of wrapup) {
    if (!s.firstVoteAt) continue;
    const first = s.firstVoteAt instanceof Date ? s.firstVoteAt : new Date(s.firstVoteAt);
    if (minutesSince(first, now) < LIVE_AUTO_SUBMIT_AFTER_MIN) continue;
    await createLiveSubmissionFromSession({ sessionId: s.id, auto: true, now });
  }
}

export type LiveSessionPublic = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoPath: string | null;
  awayLogoPath: string | null;
  venue: string | null;
  status: "ACTIVE" | "WRAPUP" | "CLOSED";
  firstVoteAt: string | null;
  majority: MajorityResult | null;
  minutesSinceFirstVote: number | null;
  inWrapup: boolean;
  autoSubmitAfterMinutes: number;
  /** Distinct viewers with a recent heartbeat on `/live/[id]` (see `live_session_presence`). */
  activeViewerCount: number;
};

const VOTER_USER_KEY =
  /^user:([0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i;

export async function listLiveScoreFeed(sessionId: string, limit = 100): Promise<LiveScoreFeedItem[]> {
  const cap = Math.min(Math.max(1, limit), 200);
  const votes = await db
    .select()
    .from(liveScoreVotes)
    .where(eq(liveScoreVotes.sessionId, sessionId))
    .orderBy(desc(liveScoreVotes.createdAt))
    .limit(cap);

  const ids = new Set<string>();
  for (const v of votes) {
    const m = VOTER_USER_KEY.exec(v.voterKey);
    if (m) ids.add(m[1]);
  }

  let profileById = new Map<string, { displayName: string; avatarPath: string | null }>();
  if (ids.size > 0) {
    const profs = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        avatarPath: profiles.avatarPath,
      })
      .from(profiles)
      .where(inArray(profiles.id, Array.from(ids)));

    profileById = new Map(profs.map((p) => [p.id, p]));
  }

  return votes.map((v) => {
    const m = VOTER_USER_KEY.exec(v.voterKey);
    const uid = m?.[1];
    const p = uid ? profileById.get(uid) : undefined;
    const created = v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt);
    return {
      id: v.id,
      at: created.toISOString(),
      homeScore: v.homeScore,
      awayScore: v.awayScore,
      displayName: p?.displayName ?? (uid ? "Contributor" : "Guest"),
      avatarUrl: getProfileAvatarPublicUrl(p?.avatarPath ?? null),
    };
  });
}

export type ListUnderwayLiveSessionsOpts = {
  /** Case-insensitive match on home or away team name. */
  q?: string;
  /** Max rows (default 10, capped at 50). */
  limit?: number;
};

async function rowToLiveSessionPublic(s: (typeof liveSessions.$inferSelect), now: Date): Promise<LiveSessionPublic> {
  const votes = await loadVotes(s.id);
  const majority = majorityFromVotes(
    votes.map((v) => ({
      voterKey: v.voterKey,
      homeScore: v.homeScore,
      awayScore: v.awayScore,
      createdAt: v.createdAt instanceof Date ? v.createdAt : new Date(v.createdAt),
    }))
  );
  const first = s.firstVoteAt
    ? s.firstVoteAt instanceof Date
      ? s.firstVoteAt
      : new Date(s.firstVoteAt)
    : null;
  return {
    id: s.id,
    activeViewerCount: 0,
    homeTeamName: s.homeTeamName,
    awayTeamName: s.awayTeamName,
    homeLogoPath: s.homeLogoPath ?? null,
    awayLogoPath: s.awayLogoPath ?? null,
    venue: s.venue,
    status: s.status as LiveSessionPublic["status"],
    firstVoteAt: first ? first.toISOString() : null,
    majority,
    minutesSinceFirstVote: first ? minutesSince(first, now) : null,
    inWrapup: s.status === "WRAPUP",
    autoSubmitAfterMinutes: LIVE_AUTO_SUBMIT_AFTER_MIN,
  };
}

export async function listUnderwayLiveSessions(opts?: ListUnderwayLiveSessionsOpts): Promise<LiveSessionPublic[]> {
  await processLiveSessionDeadlines();
  const limitN = Math.min(Math.max(1, opts?.limit ?? 10), 50);
  const rawQ = (opts?.q ?? "").trim().slice(0, 120).replace(/[%_\\]/g, "");

  const statusOpen = inArray(liveSessions.status, ["ACTIVE", "WRAPUP"]);
  const whereClause =
    rawQ.length > 0
      ? and(
          statusOpen,
          or(
            ilike(liveSessions.homeTeamName, `%${rawQ}%`),
            ilike(liveSessions.awayTeamName, `%${rawQ}%`)
          )
        )
      : statusOpen;

  const rows = await db
    .select()
    .from(liveSessions)
    .where(whereClause)
    .orderBy(desc(liveSessions.createdAt))
    .limit(limitN);

  const now = new Date();
  const out: LiveSessionPublic[] = [];
  for (const s of rows) {
    out.push(await rowToLiveSessionPublic(s, now));
  }
  const counts = await getActiveViewerCountsBySessionIds(out.map((x) => x.id));
  return out.map((x) => ({ ...x, activeViewerCount: counts.get(x.id) ?? 0 }));
}

export async function getUnderwayLiveSessionById(sessionId: string): Promise<LiveSessionPublic | null> {
  await processLiveSessionDeadlines();
  const [s] = await db
    .select()
    .from(liveSessions)
    .where(and(eq(liveSessions.id, sessionId), inArray(liveSessions.status, ["ACTIVE", "WRAPUP"])))
    .limit(1);
  if (!s) return null;
  const row = await rowToLiveSessionPublic(s, new Date());
  const counts = await getActiveViewerCountsBySessionIds([sessionId]);
  return { ...row, activeViewerCount: counts.get(sessionId) ?? 0 };
}

export async function insertLiveSessionRow(input: {
  homeTeamName: string;
  awayTeamName: string;
  homeLogoPath: string | null;
  awayLogoPath: string | null;
  venue: string | null;
  createdByUserId: string | null;
}) {
  const [row] = await db
    .insert(liveSessions)
    .values({
      homeTeamName: input.homeTeamName.trim(),
      awayTeamName: input.awayTeamName.trim(),
      homeLogoPath: input.homeLogoPath,
      awayLogoPath: input.awayLogoPath,
      venue: input.venue?.trim() || null,
      createdByUserId: input.createdByUserId,
      status: "ACTIVE",
    })
    .returning({ id: liveSessions.id });
  return row;
}

export async function insertLiveVoteRow(input: {
  sessionId: string;
  voterKey: string;
  homeScore: number;
  awayScore: number;
}) {
  const now = new Date();
  await db.insert(liveScoreVotes).values({
    sessionId: input.sessionId,
    voterKey: input.voterKey,
    homeScore: input.homeScore,
    awayScore: input.awayScore,
  });

  const [s] = await db.select().from(liveSessions).where(eq(liveSessions.id, input.sessionId)).limit(1);
  if (s && !s.firstVoteAt) {
    await db
      .update(liveSessions)
      .set({ firstVoteAt: now, updatedAt: now })
      .where(eq(liveSessions.id, input.sessionId));
  } else if (s) {
    await db.update(liveSessions).set({ updatedAt: now }).where(eq(liveSessions.id, input.sessionId));
  }
}

export async function getLiveSessionForVote(sessionId: string) {
  const [s] = await db.select().from(liveSessions).where(eq(liveSessions.id, sessionId)).limit(1);
  return s ?? null;
}
