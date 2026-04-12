import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveSessions, liveScoreVotes } from "@/db/schema";
import { createLiveSubmissionFromSession } from "@/lib/backend/live-session-wrapup";
import { LIVE_AUTO_SUBMIT_AFTER_MIN, LIVE_WRAPUP_AFTER_MIN } from "@/lib/live-constants";
import { majorityFromVotes, type MajorityResult } from "@/lib/live-majority";

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
  venue: string | null;
  status: "ACTIVE" | "WRAPUP" | "CLOSED";
  firstVoteAt: string | null;
  majority: MajorityResult | null;
  minutesSinceFirstVote: number | null;
  inWrapup: boolean;
  autoSubmitAfterMinutes: number;
};

export async function listUnderwayLiveSessions(): Promise<LiveSessionPublic[]> {
  await processLiveSessionDeadlines();
  const rows = await db
    .select()
    .from(liveSessions)
    .where(inArray(liveSessions.status, ["ACTIVE", "WRAPUP"]))
    .orderBy(desc(liveSessions.createdAt));

  const now = new Date();
  const out: LiveSessionPublic[] = [];
  for (const s of rows) {
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
    out.push({
      id: s.id,
      homeTeamName: s.homeTeamName,
      awayTeamName: s.awayTeamName,
      venue: s.venue,
      status: s.status as LiveSessionPublic["status"],
      firstVoteAt: first ? first.toISOString() : null,
      majority,
      minutesSinceFirstVote: first ? minutesSince(first, now) : null,
      inWrapup: s.status === "WRAPUP",
      autoSubmitAfterMinutes: LIVE_AUTO_SUBMIT_AFTER_MIN,
    });
  }
  return out;
}

export async function insertLiveSessionRow(input: {
  homeTeamName: string;
  awayTeamName: string;
  venue: string | null;
  createdByUserId: string | null;
}) {
  const [row] = await db
    .insert(liveSessions)
    .values({
      homeTeamName: input.homeTeamName.trim(),
      awayTeamName: input.awayTeamName.trim(),
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
