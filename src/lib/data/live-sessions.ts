import { and, asc, desc, eq, gte, ilike, inArray, isNull, ne, or, sql } from "drizzle-orm";
import type { SchoolSport } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";
import { db } from "@/lib/db";
import { liveSessions, liveScoreVotes, profiles, schools, submissions } from "@/db/schema";
import { getProfileAvatarPublicUrl } from "@/lib/profile-avatar";
import type { LiveScoreFeedItem, LiveSessionClientRow } from "@/lib/live-session-types";
import { createLiveSubmissionFromSession } from "@/lib/backend/live-session-wrapup";
import { LIVE_AUTO_SUBMIT_AFTER_MIN, LIVE_WRAPUP_AFTER_MIN } from "@/lib/live-constants";
import { majorityFromVotes, type MajorityResult } from "@/lib/live-majority";
import {
  liveSessionsHasTeamGenderColumn,
  liveSessionsSelectColumns,
} from "@/lib/live-session-db-support";

export { LIVE_AUTO_SUBMIT_AFTER_MIN, LIVE_WRAPUP_AFTER_MIN };
export type { MajorityResult };

function minutesSince(start: Date | null, end: Date): number {
  if (!start) return 0;
  return (end.getTime() - start.getTime()) / 60_000;
}

function toJsDate(v: Date | string | null | undefined): Date | null {
  if (v == null) return null;
  return v instanceof Date ? v : new Date(v);
}

/** Anchor for wrap-up / auto-submit: when the board opened for scoring, not first vote. */
function scoringDeadlineAnchor(s: {
  scoringOpenedAt?: Date | string | null;
  createdAt: Date | string;
}): Date {
  const opened = toJsDate(s.scoringOpenedAt);
  if (opened) return opened;
  const created = toJsDate(s.createdAt);
  return created ?? new Date();
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

/**
 * Flip scheduled boards to ACTIVE once `goes_live_at` has passed.
 * Sets `scoring_opened_at` to `goes_live_at` (RPC) so wrap-up / auto-submit timers start at the
 * scheduled start — same rules as immediate boards, but from go-live, not row creation.
 */
export async function activateDueScheduledLiveSessions(now = new Date()): Promise<void> {
  // Use SECURITY DEFINER RPC (migration 00019): direct UPDATE hits RLS when DATABASE_URL
  // is not the table owner; live_sessions only has a SELECT policy.
  // Explicit timestamptz literal avoids ambiguous $1 typing; migration 00021 grants EXECUTE to PUBLIC.
  const iso = now.toISOString();
  await db.execute(
    sql`select public.prssa_activate_scheduled_live_sessions(${sql.raw(`'${iso}'::timestamptz`)})`,
  );
}

export async function processLiveSessionDeadlines(now = new Date()): Promise<void> {
  await activateDueScheduledLiveSessions(now);
  const includeTg = await liveSessionsHasTeamGenderColumn();
  const lsCols = liveSessionsSelectColumns(includeTg);
  const open = await db
    .select(lsCols)
    .from(liveSessions)
    .where(inArray(liveSessions.status, ["ACTIVE", "WRAPUP"]));

  for (const s of open) {
    const anchor = scoringDeadlineAnchor(s);
    const minSince = minutesSince(anchor, now);

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
    .select(lsCols)
    .from(liveSessions)
    .where(and(eq(liveSessions.status, "WRAPUP"), sql`${liveSessions.submissionId} is null`));

  for (const s of wrapup) {
    const anchor = scoringDeadlineAnchor(s);
    if (minutesSince(anchor, now) < LIVE_AUTO_SUBMIT_AFTER_MIN) continue;
    await createLiveSubmissionFromSession({ sessionId: s.id, auto: true, now });
  }
}

export type LiveSessionPublic = {
  id: string;
  sport: SchoolSport;
  teamGender: TeamGender | null;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoPath: string | null;
  awayLogoPath: string | null;
  venue: string | null;
  status: "ACTIVE" | "WRAPUP" | "CLOSED";
  scoringOpenedAt: string | null;
  firstVoteAt: string | null;
  majority: MajorityResult | null;
  minutesSinceFirstVote: number | null;
  minutesSinceScoringOpened: number | null;
  inWrapup: boolean;
  autoSubmitAfterMinutes: number;
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
  /** When set, only sessions for this sport. */
  sport?: SchoolSport;
};

function normalizedTeamKey(name: string): string {
  return name.trim().toLowerCase();
}

/**
 * For live sessions without `home_logo_path` / `away_logo_path`, resolve logos from active schools when
 * the team label matches `schools.display_name` or `schools.official_name` (trimmed, case-insensitive).
 */
export async function batchResolveSchoolLogosByTeamNames(teamNames: string[]): Promise<Map<string, string | null>> {
  const unique = Array.from(new Set(teamNames.map(normalizedTeamKey).filter((k) => k.length > 0)));
  const result = new Map<string, string | null>();
  if (unique.length === 0) return result;

  const nameOrs = unique.map((norm) =>
    or(
      sql`lower(trim(${schools.displayName})) = ${norm}`,
      sql`lower(trim(coalesce(${schools.officialName}, ''))) = ${norm}`
    )!
  );

  const rows = await db
    .select({
      logoPath: schools.logoPath,
      displayNorm: sql<string>`lower(trim(${schools.displayName}))`,
      officialNorm: sql<string>`lower(trim(coalesce(${schools.officialName}, '')))`,
    })
    .from(schools)
    .where(and(eq(schools.active, true), or(...nameOrs)));

  for (const norm of unique) {
    const hit = rows.find(
      (r) => r.displayNorm === norm || (r.officialNorm.length > 0 && r.officialNorm === norm)
    );
    result.set(norm, hit?.logoPath ?? null);
  }
  return result;
}

function mergeStoredOrSchoolLogo(
  stored: string | null | undefined,
  teamName: string,
  schoolLogoByNorm: Map<string, string | null> | undefined
): string | null {
  const t = stored?.trim();
  if (t) return t;
  if (!schoolLogoByNorm) return null;
  return schoolLogoByNorm.get(normalizedTeamKey(teamName)) ?? null;
}

type LiveSessionRowForPublic = Omit<typeof liveSessions.$inferSelect, "teamGender"> & {
  teamGender?: typeof liveSessions.$inferSelect.teamGender;
};

async function rowToLiveSessionPublic(
  s: LiveSessionRowForPublic,
  now: Date,
  schoolLogoByNorm?: Map<string, string | null>
): Promise<LiveSessionPublic> {
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
  const openedAt = scoringDeadlineAnchor(s);
  return {
    id: s.id,
    sport: s.sport as SchoolSport,
    teamGender:
      "teamGender" in s && s.teamGender != null ? (s.teamGender as TeamGender) : null,
    homeTeamName: s.homeTeamName,
    awayTeamName: s.awayTeamName,
    homeLogoPath: mergeStoredOrSchoolLogo(s.homeLogoPath, s.homeTeamName, schoolLogoByNorm),
    awayLogoPath: mergeStoredOrSchoolLogo(s.awayLogoPath, s.awayTeamName, schoolLogoByNorm),
    venue: s.venue,
    status: s.status as LiveSessionPublic["status"],
    scoringOpenedAt: openedAt.toISOString(),
    firstVoteAt: first ? first.toISOString() : null,
    majority,
    minutesSinceFirstVote: first ? minutesSince(first, now) : null,
    minutesSinceScoringOpened: minutesSince(openedAt, now),
    inWrapup: s.status === "WRAPUP",
    autoSubmitAfterMinutes: LIVE_AUTO_SUBMIT_AFTER_MIN,
  };
}

export async function listUnderwayLiveSessions(opts?: ListUnderwayLiveSessionsOpts): Promise<LiveSessionPublic[]> {
  await processLiveSessionDeadlines();
  const limitN = Math.min(Math.max(1, opts?.limit ?? 10), 50);
  const rawQ = (opts?.q ?? "").trim().slice(0, 120).replace(/[%_\\]/g, "");

  const statusOpen = inArray(liveSessions.status, ["ACTIVE", "WRAPUP"]);
  const sportClause = opts?.sport ? eq(liveSessions.sport, opts.sport) : undefined;
  const searchClause =
    rawQ.length > 0
      ? or(
          ilike(liveSessions.homeTeamName, `%${rawQ}%`),
          ilike(liveSessions.awayTeamName, `%${rawQ}%`)
        )
      : undefined;
  const whereClause =
    sportClause && searchClause
      ? and(statusOpen, sportClause, searchClause)
      : sportClause
        ? and(statusOpen, sportClause)
        : searchClause
          ? and(statusOpen, searchClause)
          : statusOpen;

  const includeTg = await liveSessionsHasTeamGenderColumn();
  const rows = await db
    .select(liveSessionsSelectColumns(includeTg))
    .from(liveSessions)
    .where(whereClause)
    .orderBy(desc(liveSessions.createdAt))
    .limit(limitN);

  const namesForLogoLookup: string[] = [];
  for (const s of rows) {
    if (!s.homeLogoPath?.trim()) namesForLogoLookup.push(s.homeTeamName);
    if (!s.awayLogoPath?.trim()) namesForLogoLookup.push(s.awayTeamName);
  }
  const schoolLogoByNorm = await batchResolveSchoolLogosByTeamNames(namesForLogoLookup);

  const now = new Date();
  const out: LiveSessionPublic[] = [];
  for (const s of rows) {
    out.push(await rowToLiveSessionPublic(s, now, schoolLogoByNorm));
  }
  return out;
}

/** Scheduled scoreboards with a future go-live time, soonest first. */
export async function listScheduledLiveSessions(
  opts?: { limit?: number; offset?: number; sport?: SchoolSport }
): Promise<LiveSessionClientRow[]> {
  await processLiveSessionDeadlines();
  const limitN = Math.min(Math.max(1, opts?.limit ?? 15), 50);
  const offsetN = Math.min(Math.max(0, opts?.offset ?? 0), 500);
  const now = new Date();
  const includeTg = await liveSessionsHasTeamGenderColumn();
  const sportClause = opts?.sport ? eq(liveSessions.sport, opts.sport) : undefined;
  const base = and(
    eq(liveSessions.status, "SCHEDULED"),
    sql`${liveSessions.goesLiveAt} is not null`,
    gte(liveSessions.goesLiveAt, now)
  );
  const whereClause = sportClause ? and(base, sportClause) : base;
  const rows = await db
    .select(liveSessionsSelectColumns(includeTg))
    .from(liveSessions)
    .where(whereClause)
    .orderBy(asc(liveSessions.goesLiveAt))
    .offset(offsetN)
    .limit(limitN);

  const namesForLogoLookup: string[] = [];
  for (const s of rows) {
    if (!s.homeLogoPath?.trim()) namesForLogoLookup.push(s.homeTeamName);
    if (!s.awayLogoPath?.trim()) namesForLogoLookup.push(s.awayTeamName);
  }
  const schoolLogoByNorm = await batchResolveSchoolLogosByTeamNames(namesForLogoLookup);

  return rows.map((s) =>
    scheduledSessionToClientRow(s as LiveSessionRowForPublic, schoolLogoByNorm, undefined)
  );
}

export async function getUnderwayLiveSessionById(sessionId: string): Promise<LiveSessionPublic | null> {
  await processLiveSessionDeadlines();
  const includeTg = await liveSessionsHasTeamGenderColumn();
  const [s] = await db
    .select(liveSessionsSelectColumns(includeTg))
    .from(liveSessions)
    .where(and(eq(liveSessions.id, sessionId), inArray(liveSessions.status, ["ACTIVE", "WRAPUP"])))
    .limit(1);
  if (!s) return null;
  const namesForLogoLookup: string[] = [];
  if (!s.homeLogoPath?.trim()) namesForLogoLookup.push(s.homeTeamName);
  if (!s.awayLogoPath?.trim()) namesForLogoLookup.push(s.awayTeamName);
  const schoolLogoByNorm = await batchResolveSchoolLogosByTeamNames(namesForLogoLookup);
  return await rowToLiveSessionPublic(s, new Date(), schoolLogoByNorm);
}

function liveSessionPublicToClientRow(
  pub: LiveSessionPublic,
  createdByUserId: string | null,
  _viewerUserId: string | null | undefined,
): LiveSessionClientRow {
  void _viewerUserId;
  const canCancel = false;
  return {
    id: pub.id,
    sport: pub.sport,
    teamGender: pub.teamGender,
    homeTeamName: pub.homeTeamName,
    awayTeamName: pub.awayTeamName,
    homeLogoPath: pub.homeLogoPath,
    awayLogoPath: pub.awayLogoPath,
    venue: pub.venue,
    status: pub.status,
    scoringOpenedAt: pub.scoringOpenedAt,
    firstVoteAt: pub.firstVoteAt,
    majority: pub.majority,
    minutesSinceFirstVote: pub.minutesSinceFirstVote,
    minutesSinceScoringOpened: pub.minutesSinceScoringOpened,
    inWrapup: pub.inWrapup,
    autoSubmitAfterMinutes: pub.autoSubmitAfterMinutes,
    goesLiveAt: null,
    createdByUserId,
    canCancelScheduled: canCancel,
  };
}

function scheduledSessionToClientRow(
  s: LiveSessionRowForPublic & { goesLiveAt?: Date | string | null; createdByUserId?: string | null },
  schoolLogoByNorm: Map<string, string | null> | undefined,
  viewerUserId: string | null | undefined,
): LiveSessionClientRow {
  const rawGl = "goesLiveAt" in s ? s.goesLiveAt : null;
  const gl = rawGl ? (rawGl instanceof Date ? rawGl : new Date(rawGl)) : null;
  const canCancel = Boolean(
    viewerUserId && s.createdByUserId && viewerUserId === s.createdByUserId && s.status === "SCHEDULED",
  );
  return {
    id: s.id,
    sport: s.sport as SchoolSport,
    teamGender:
      "teamGender" in s && s.teamGender != null ? (s.teamGender as TeamGender) : null,
    homeTeamName: s.homeTeamName,
    awayTeamName: s.awayTeamName,
    homeLogoPath: mergeStoredOrSchoolLogo(s.homeLogoPath, s.homeTeamName, schoolLogoByNorm),
    awayLogoPath: mergeStoredOrSchoolLogo(s.awayLogoPath, s.awayTeamName, schoolLogoByNorm),
    venue: s.venue,
    status: "SCHEDULED",
    scoringOpenedAt: null,
    firstVoteAt: null,
    majority: null,
    minutesSinceFirstVote: null,
    minutesSinceScoringOpened: null,
    inWrapup: false,
    autoSubmitAfterMinutes: LIVE_AUTO_SUBMIT_AFTER_MIN,
    goesLiveAt: gl ? gl.toISOString() : null,
    createdByUserId: s.createdByUserId ?? null,
    canCancelScheduled: canCancel,
  };
}

/** Public viewer JSON: ACTIVE, WRAPUP, or SCHEDULED (upcoming). */
export async function getLiveSessionPublicById(
  sessionId: string,
  viewerUserId?: string | null,
): Promise<LiveSessionClientRow | null> {
  await processLiveSessionDeadlines();
  const includeTg = await liveSessionsHasTeamGenderColumn();
  const [s] = await db
    .select(liveSessionsSelectColumns(includeTg))
    .from(liveSessions)
    .where(and(eq(liveSessions.id, sessionId), ne(liveSessions.status, "CLOSED")))
    .limit(1);
  if (!s) return null;
  const namesForLogoLookup: string[] = [];
  if (!s.homeLogoPath?.trim()) namesForLogoLookup.push(s.homeTeamName);
  if (!s.awayLogoPath?.trim()) namesForLogoLookup.push(s.awayTeamName);
  const schoolLogoByNorm = await batchResolveSchoolLogosByTeamNames(namesForLogoLookup);
  if (s.status === "SCHEDULED") {
    return scheduledSessionToClientRow(s as LiveSessionRowForPublic, schoolLogoByNorm, viewerUserId);
  }
  const pub = await rowToLiveSessionPublic(s, new Date(), schoolLogoByNorm);
  return liveSessionPublicToClientRow(pub, s.createdByUserId ?? null, viewerUserId);
}

/** Same home/away pairing (trimmed, case-insensitive) already in ACTIVE or WRAPUP — do not start a duplicate board. */
export async function findOpenLiveSessionDuplicate(
  homeTeamName: string,
  awayTeamName: string,
  sport: SchoolSport,
  teamGender: TeamGender | null
): Promise<{ id: string } | null> {
  await processLiveSessionDeadlines();
  const h = homeTeamName.trim().toLowerCase();
  const a = awayTeamName.trim().toLowerCase();
  if (!h || !a) return null;
  const includeTg = await liveSessionsHasTeamGenderColumn();
  const dupGender = sport === "HOCKEY" ? teamGender : null;
  const genderClause = includeTg
    ? dupGender != null
      ? eq(liveSessions.teamGender, dupGender)
      : isNull(liveSessions.teamGender)
    : null;
  const dupWhere = includeTg
    ? and(
        inArray(liveSessions.status, ["ACTIVE", "WRAPUP", "SCHEDULED"]),
        eq(liveSessions.sport, sport),
        genderClause!,
        sql`lower(trim(${liveSessions.homeTeamName})) = ${h}`,
        sql`lower(trim(${liveSessions.awayTeamName})) = ${a}`
      )
    : and(
        inArray(liveSessions.status, ["ACTIVE", "WRAPUP", "SCHEDULED"]),
        eq(liveSessions.sport, sport),
        sql`lower(trim(${liveSessions.homeTeamName})) = ${h}`,
        sql`lower(trim(${liveSessions.awayTeamName})) = ${a}`
      );
  const [row] = await db.select({ id: liveSessions.id }).from(liveSessions).where(dupWhere).limit(1);
  return row ?? null;
}

export async function insertLiveSessionRow(input: {
  sport: SchoolSport;
  teamGender: TeamGender | null;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoPath: string | null;
  awayLogoPath: string | null;
  venue: string | null;
  seasonId: string | null;
  competitionId: string | null;
  createdByUserId: string | null;
  status?: "ACTIVE" | "SCHEDULED";
  goesLiveAt?: Date | null;
}) {
  const includeTg = await liveSessionsHasTeamGenderColumn();
  const status = input.status ?? "ACTIVE";
  const now = new Date();
  const [row] = await db
    .insert(liveSessions)
    .values({
      sport: input.sport,
      ...(includeTg ? { teamGender: input.teamGender } : {}),
      homeTeamName: input.homeTeamName.trim(),
      awayTeamName: input.awayTeamName.trim(),
      homeLogoPath: input.homeLogoPath,
      awayLogoPath: input.awayLogoPath,
      venue: input.venue?.trim() || null,
      seasonId: input.seasonId,
      competitionId: input.competitionId,
      createdByUserId: input.createdByUserId,
      status,
      goesLiveAt: status === "SCHEDULED" ? (input.goesLiveAt ?? null) : null,
      scoringOpenedAt: status === "ACTIVE" ? now : null,
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

  const includeTg = await liveSessionsHasTeamGenderColumn();
  const [s] = await db
    .select(liveSessionsSelectColumns(includeTg))
    .from(liveSessions)
    .where(eq(liveSessions.id, input.sessionId))
    .limit(1);
  if (s && !s.firstVoteAt && s.status !== "SCHEDULED") {
    await db
      .update(liveSessions)
      .set({ firstVoteAt: now, updatedAt: now })
      .where(eq(liveSessions.id, input.sessionId));
  } else if (s) {
    await db.update(liveSessions).set({ updatedAt: now }).where(eq(liveSessions.id, input.sessionId));
  }
}

export async function getLiveSessionForVote(sessionId: string) {
  const includeTg = await liveSessionsHasTeamGenderColumn();
  const [s] = await db
    .select(liveSessionsSelectColumns(includeTg))
    .from(liveSessions)
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  return s ?? null;
}

/** Force wrap-up (stop open voting) for an open live session. */
export async function adminStopLiveSessionRow(
  sessionId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const now = new Date();
  const includeTg = await liveSessionsHasTeamGenderColumn();
  const [s] = await db
    .select(liveSessionsSelectColumns(includeTg))
    .from(liveSessions)
    .where(eq(liveSessions.id, sessionId))
    .limit(1);
  if (!s) return { ok: false, error: "Live game not found." };
  if (s.status === "CLOSED") return { ok: false, error: "This live game is already closed." };
  if (s.submissionId) {
    return { ok: false, error: "Already linked to a submission — delete the board if you need it removed." };
  }

  if (s.status === "SCHEDULED") {
    await db
      .update(liveSessions)
      .set({ status: "CLOSED", updatedAt: now })
      .where(eq(liveSessions.id, sessionId));
    return { ok: true };
  }

  await db
    .update(liveSessions)
    .set({
      status: "WRAPUP",
      wrapupStartedAt: s.wrapupStartedAt ?? now,
      updatedAt: now,
    })
    .where(eq(liveSessions.id, sessionId));

  return { ok: true };
}

/** Remove live session and votes; clears optional `submissions.live_session_id` link. */
export async function deleteLiveSessionById(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const [s] = await db.select({ id: liveSessions.id }).from(liveSessions).where(eq(liveSessions.id, sessionId)).limit(1);
  if (!s) return { ok: false, error: "Live game not found." };

  await db.transaction(async (tx) => {
    await tx.update(submissions).set({ liveSessionId: null }).where(eq(submissions.liveSessionId, sessionId));
    await tx.delete(liveSessions).where(eq(liveSessions.id, sessionId));
  });

  return { ok: true };
}

export async function adminDeleteLiveSessionRow(
  sessionId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  return deleteLiveSessionById(sessionId);
}

export async function listLiveSessionsByCreator(profileId: string, limit = 30) {
  await processLiveSessionDeadlines();
  const includeTg = await liveSessionsHasTeamGenderColumn();
  const cap = Math.min(Math.max(1, limit), 50);
  return db
    .select(liveSessionsSelectColumns(includeTg))
    .from(liveSessions)
    .where(eq(liveSessions.createdByUserId, profileId))
    .orderBy(desc(liveSessions.createdAt))
    .limit(cap);
}
