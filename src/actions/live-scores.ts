"use server";

import { getSessionUser } from "@/lib/auth";
import { ensureContributorProfile } from "@/lib/auth/ensure-profile";
import { verifyTurnstileToken } from "@/lib/turnstile";
import {
  castLiveVoteSchema,
  createLiveSessionSchema,
  submitLiveWrapupSchema,
} from "@/lib/validators/live";
import {
  getLiveSessionForVote,
  insertLiveSessionRow,
  insertLiveVoteRow,
} from "@/lib/data/live-sessions";
import { createLiveSubmissionFromSession } from "@/lib/backend/live-session-wrapup";

const AUTH_MSG = "Sign in to start or update live scores.";

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
  const row = await insertLiveSessionRow({
    homeTeamName: parsed.data.homeTeamName,
    awayTeamName: parsed.data.awayTeamName,
    homeLogoPath: parsed.data.homeLogoPath?.trim() || null,
    awayLogoPath: parsed.data.awayLogoPath?.trim() || null,
    venue: parsed.data.venue ?? null,
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
