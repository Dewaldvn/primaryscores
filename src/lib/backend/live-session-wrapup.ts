import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveSessions, liveScoreVotes, submissions } from "@/db/schema";
import { LIVE_AUTO_SUBMIT_AFTER_MIN } from "@/lib/live-constants";
import { majorityFromVotes } from "@/lib/live-majority";
import {
  liveSessionsHasTeamGenderColumn,
  liveSessionsSelectColumns,
} from "@/lib/live-session-db-support";

function toDate(v: Date | string): Date {
  return v instanceof Date ? v : new Date(v);
}

export async function createLiveSubmissionFromSession(opts: {
  sessionId: string;
  auto: boolean;
  now: Date;
  submittedByUserId?: string | null;
  /** Manual path only: allow submission while still ACTIVE (admin override). */
  adminSkipWrapupGate?: boolean;
}): Promise<{ ok: true; submissionId: string } | { ok: false; reason: string }> {
  const { sessionId, auto, now, submittedByUserId = null, adminSkipWrapupGate = false } = opts;

  try {
    const includeTg = await liveSessionsHasTeamGenderColumn();
    const lsCols = liveSessionsSelectColumns(includeTg);
    return await db.transaction(async (tx) => {
      const [s] = await tx
        .select(lsCols)
        .from(liveSessions)
        .where(eq(liveSessions.id, sessionId))
        .for("update");

      if (!s) return { ok: false, reason: "not_found" };
      if (s.submissionId) return { ok: false, reason: "already_submitted" };
      if (s.status === "CLOSED") return { ok: false, reason: "closed" };
      if (s.status === "SCHEDULED") return { ok: false, reason: "scheduled" };

      if (auto) {
        if (s.status !== "WRAPUP") return { ok: false, reason: "not_wrapup" };
        if (!s.firstVoteAt) return { ok: false, reason: "no_first_vote" };
        const first = toDate(s.firstVoteAt);
        if ((now.getTime() - first.getTime()) / 60_000 < LIVE_AUTO_SUBMIT_AFTER_MIN) {
          return { ok: false, reason: "too_early" };
        }
      } else {
        if (adminSkipWrapupGate) {
          if (s.status !== "ACTIVE" && s.status !== "WRAPUP") {
            return { ok: false, reason: "not_active_or_wrapup" };
          }
        } else if (s.status !== "WRAPUP") {
          return { ok: false, reason: "not_in_wrapup" };
        }
      }

      const voteRows = await tx
        .select({
          voterKey: liveScoreVotes.voterKey,
          homeScore: liveScoreVotes.homeScore,
          awayScore: liveScoreVotes.awayScore,
          createdAt: liveScoreVotes.createdAt,
        })
        .from(liveScoreVotes)
        .where(eq(liveScoreVotes.sessionId, sessionId))
        .orderBy(desc(liveScoreVotes.createdAt));

      const maj =
        majorityFromVotes(
          voteRows.map((v) => ({
            voterKey: v.voterKey,
            homeScore: v.homeScore,
            awayScore: v.awayScore,
            createdAt: toDate(v.createdAt),
          }))
        ) ?? { homeScore: 0, awayScore: 0, voterCount: 0 };

      const matchDate = now.toISOString().slice(0, 10);
      const notes =
        (auto
          ? `LIVE_SESSION_AUTO session=${sessionId} (${LIVE_AUTO_SUBMIT_AFTER_MIN}m elapsed, no manual wrap-up)`
          : `LIVE_SESSION_MANUAL session=${sessionId}`) + ` sport=${s.sport}`;

      const [ins] = await tx
        .insert(submissions)
        .values({
          proposedHomeTeamName: s.homeTeamName,
          proposedAwayTeamName: s.awayTeamName,
          proposedMatchDate: matchDate,
          proposedHomeScore: maj.homeScore,
          proposedAwayScore: maj.awayScore,
          proposedVenue: s.venue?.trim() || null,
          submittedByUserId,
          notes,
          liveSessionId: sessionId,
          moderationStatus: "PENDING",
        })
        .returning({ id: submissions.id });

      const [upd] = await tx
        .update(liveSessions)
        .set({
          status: "CLOSED",
          submissionId: ins.id,
          updatedAt: now,
        })
        .where(and(eq(liveSessions.id, sessionId), sql`${liveSessions.submissionId} is null`))
        .returning({ id: liveSessions.id });

      if (!upd) {
        throw new Error("live_session_concurrent_update");
      }

      return { ok: true, submissionId: ins.id };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unique|duplicate|concurrent/i.test(msg)) {
      return { ok: false, reason: "race" };
    }
    throw e;
  }
}
