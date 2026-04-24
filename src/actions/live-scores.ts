"use server";

import { eq } from "drizzle-orm";
import { ensureContributorProfile } from "@/lib/auth/ensure-profile";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  adminLiveSessionIdSchema,
  castLiveVoteSchema,
  createLiveSessionSchema,
  submitLiveWrapupSchema,
} from "@/lib/validators/live";
import { getProfile, getSessionUser } from "@/lib/auth";
import {
  adminDeleteLiveSessionRow,
  adminStopLiveSessionRow,
  findOpenLiveSessionDuplicate,
  getLiveSessionForVote,
  insertLiveSessionRow,
  insertLiveVoteRow,
} from "@/lib/data/live-sessions";
import { createLiveSubmissionFromSession } from "@/lib/backend/live-session-wrapup";
import { db } from "@/lib/db";
import { competitions, seasons } from "@/db/schema";
import type { SchoolSport } from "@/lib/sports";

const AUTH_MSG = "Sign in to start or update live scores.";

async function assertSeasonCompetitionMatchSport(
  sport: SchoolSport,
  seasonId: string | null | undefined,
  competitionId: string | null | undefined
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (seasonId) {
    const [r] = await db
      .select({ sport: seasons.sport })
      .from(seasons)
      .where(eq(seasons.id, seasonId))
      .limit(1);
    if (!r) return { ok: false, error: "Season not found." };
    if (r.sport !== sport) {
      return { ok: false, error: "That season does not match the selected sport." };
    }
  }
  if (competitionId) {
    const [r] = await db
      .select({ sport: competitions.sport })
      .from(competitions)
      .where(eq(competitions.id, competitionId))
      .limit(1);
    if (!r) return { ok: false, error: "Competition not found." };
    if (r.sport !== sport) {
      return { ok: false, error: "That competition does not match the selected sport." };
    }
  }
  return { ok: true };
}

export async function createLiveSessionAction(input: unknown) {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: AUTH_MSG };
  }

  const parsed = createLiveSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const turnOk = await verifyTurnstileToken(parsed.data.turnstileToken);
  if (!turnOk) {
    return { ok: false as const, error: "Could not verify submission (Turnstile)." };
  }

  await ensureContributorProfile(user);

  const sport = parsed.data.sport;
  const scope = await assertSeasonCompetitionMatchSport(
    sport,
    parsed.data.seasonId,
    parsed.data.competitionId
  );
  if (!scope.ok) {
    return { ok: false as const, error: scope.error };
  }

  const teamGenderForSession =
    parsed.data.sport === "HOCKEY" ? (parsed.data.teamGender ?? null) : null;
  const dup = await findOpenLiveSessionDuplicate(
    parsed.data.homeTeamName,
    parsed.data.awayTeamName,
    parsed.data.sport,
    teamGenderForSession
  );
  if (dup) {
    return {
      ok: false as const,
      error:
        "A live scoreboard for this match is already open. Join that game instead of starting another.",
      existingSessionId: dup.id,
    };
  }

  const row = await insertLiveSessionRow({
    sport: parsed.data.sport,
    teamGender: teamGenderForSession,
    homeTeamName: parsed.data.homeTeamName,
    awayTeamName: parsed.data.awayTeamName,
    homeLogoPath: parsed.data.homeLogoPath?.trim() || null,
    awayLogoPath: parsed.data.awayLogoPath?.trim() || null,
    venue: parsed.data.venue ?? null,
    seasonId: parsed.data.seasonId ?? null,
    competitionId: parsed.data.competitionId ?? null,
    createdByUserId: user.id,
  });
  return { ok: true as const, sessionId: row.id };
}

export async function castLiveVoteAction(input: unknown) {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: AUTH_MSG };
  }

  const parsed = castLiveVoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const turnOk = await verifyTurnstileToken(parsed.data.turnstileToken);
  if (!turnOk) {
    return { ok: false as const, error: "Could not verify submission (Turnstile)." };
  }

  const session = await getLiveSessionForVote(parsed.data.sessionId);
  if (!session) return { ok: false as const, error: "Live game not found." };
  if (session.status === "SCHEDULED") {
    return {
      ok: false as const,
      error: "This scoreboard is not open yet — voting starts at the scheduled time.",
    };
  }
  if (session.status === "CLOSED") {
    return { ok: false as const, error: "This live game is already closed." };
  }

  await ensureContributorProfile(user);
  const voterKey = `user:${user.id}`;
  await insertLiveVoteRow({
    sessionId: parsed.data.sessionId,
    voterKey,
    homeScore: parsed.data.homeScore,
    awayScore: parsed.data.awayScore,
  });
  return { ok: true as const };
}

export async function submitLiveWrapupForReviewAction(input: unknown) {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: AUTH_MSG };
  }

  const parsed = submitLiveWrapupSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const turnOk = await verifyTurnstileToken(parsed.data.turnstileToken);
  if (!turnOk) {
    return { ok: false as const, error: "Could not verify submission (Turnstile)." };
  }

  await ensureContributorProfile(user);
  const res = await createLiveSubmissionFromSession({
    sessionId: parsed.data.sessionId,
    auto: false,
    now: new Date(),
    submittedByUserId: user.id,
  });
  if (!res.ok) {
    const msg =
      res.reason === "not_in_wrapup"
        ? "This game is not in wrap-up yet."
        : res.reason === "already_submitted"
          ? "A submission was already created for this live game."
          : res.reason === "too_early"
            ? "Wrap-up submission is not available yet."
            : res.reason;
    return { ok: false as const, error: msg };
  }
  return { ok: true as const, submissionId: res.submissionId };
}

async function requireAdminForLive() {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: AUTH_MSG };
  }
  const profile = await getProfile();
  if (!profile || profile.role !== "ADMIN") {
    return { ok: false as const, error: "Admin only." };
  }
  return { ok: true as const, user };
}

export async function adminStopLiveSessionAction(input: unknown) {
  const gate = await requireAdminForLive();
  if (!gate.ok) return gate;

  const parsed = adminLiveSessionIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid session." };
  }

  const res = await adminStopLiveSessionRow(parsed.data.sessionId);
  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const };
}

export async function adminSubmitLiveSessionAction(input: unknown) {
  const gate = await requireAdminForLive();
  if (!gate.ok) return gate;

  const parsed = adminLiveSessionIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid session." };
  }

  await ensureContributorProfile(gate.user);
  const res = await createLiveSubmissionFromSession({
    sessionId: parsed.data.sessionId,
    auto: false,
    now: new Date(),
    submittedByUserId: gate.user.id,
    adminSkipWrapupGate: true,
  });

  if (!res.ok) {
    const msg =
      res.reason === "already_submitted"
        ? "A submission was already created for this live game."
        : res.reason === "not_active_or_wrapup"
          ? "This game is not in a state that can be submitted."
          : res.reason === "closed"
            ? "This live game is already closed."
            : res.reason === "race"
              ? "Could not submit (try again)."
              : res.reason;
    return { ok: false as const, error: msg };
  }
  return { ok: true as const, submissionId: res.submissionId };
}

export async function adminDeleteLiveSessionAction(input: unknown) {
  const gate = await requireAdminForLive();
  if (!gate.ok) return gate;

  const parsed = adminLiveSessionIdSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "Invalid session." };
  }

  const res = await adminDeleteLiveSessionRow(parsed.data.sessionId);
  if (!res.ok) return { ok: false as const, error: res.error };
  return { ok: true as const };
}
