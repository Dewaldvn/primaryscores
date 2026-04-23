import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  fixtures,
  moderationLogs,
  results,
  submissions,
  teams,
} from "@/db/schema";
import type { z } from "zod";
import {
  moderationApproveSchema,
  moderationRejectSchema,
} from "@/lib/validators/submission";
import { sameAgeGroupBand } from "@/lib/age-group-match";

export type ModerationActor = { profileId: string };

export type ApproveInput = z.infer<typeof moderationApproveSchema>;
export type RejectInput = z.infer<typeof moderationRejectSchema>;

function errorChainText(err: unknown): string {
  const parts: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 8 && cur != null; i++) {
    if (cur instanceof Error) {
      parts.push(cur.message);
      cur = "cause" in cur ? (cur as Error & { cause?: unknown }).cause : undefined;
    } else if (typeof cur === "object" && cur !== null && "message" in cur) {
      parts.push(String((cur as { message: unknown }).message));
      break;
    } else {
      parts.push(String(cur));
      break;
    }
  }
  return parts.join("\n");
}

function postgresErrorCode(err: unknown): string | undefined {
  let cur: unknown = err;
  for (let i = 0; i < 8 && cur != null; i++) {
    if (typeof cur === "object" && cur !== null && "code" in cur) {
      const c = (cur as { code?: unknown }).code;
      if (typeof c === "string") return c;
    }
    cur =
      cur instanceof Error && "cause" in cur
        ? (cur as Error & { cause?: unknown }).cause
        : undefined;
  }
  return undefined;
}

const FIXTURES_NULLABLE_MIGRATION_HINT =
  "Optional season/competition requires nullable columns on fixtures. In Supabase: SQL Editor → run the two ALTER lines in supabase/migrations/00003_fixtures_optional_season_competition.sql. Or select both Season and Competition on the form.";

export async function approveSubmissionInDb(
  actor: ModerationActor,
  d: ApproveInput
): Promise<{ ok: true; fixtureId: string } | { ok: false; error: string }> {
  const [existingSub] = await db
    .select()
    .from(submissions)
    .where(eq(submissions.id, d.submissionId))
    .limit(1);

  if (!existingSub) {
    return { ok: false, error: "Submission not found." };
  }

  if (
    existingSub.moderationStatus !== "PENDING" &&
    existingSub.moderationStatus !== "NEEDS_REVIEW"
  ) {
    return { ok: false, error: "Submission is already resolved." };
  }

  const selectedTeams = await db
    .select({ id: teams.id, ageGroup: teams.ageGroup })
    .from(teams)
    .where(inArray(teams.id, [d.homeTeamId, d.awayTeamId]));
  const byId = new Map(selectedTeams.map((t) => [t.id, t]));
  const home = byId.get(d.homeTeamId);
  const away = byId.get(d.awayTeamId);
  if (!home || !away) {
    return { ok: false, error: "Selected home/away teams could not be found." };
  }
  if (!sameAgeGroupBand(home.ageGroup, away.ageGroup)) {
    return { ok: false, error: "Home and away teams must be in the same age group (e.g. U13 vs U13)." };
  }

  const now = new Date();

  const seasonOrCompetitionOmitted = d.seasonId == null || d.competitionId == null;

  const recordingForFixture =
    existingSub.recordingUrl?.trim() || null;

  try {
    const fixtureId = await db.transaction(async (tx) => {
      let fid = existingSub.fixtureId;

      if (!fid) {
        const [fx] = await tx
          .insert(fixtures)
          .values({
            seasonId: d.seasonId ?? null,
            competitionId: d.competitionId ?? null,
            matchDate: d.matchDate,
            homeTeamId: d.homeTeamId,
            awayTeamId: d.awayTeamId,
            venue: d.venue ?? null,
            recordingUrl: recordingForFixture,
            status: "PLAYED",
          })
          .returning({ id: fixtures.id });
        fid = fx.id;
      } else {
        await tx
          .update(fixtures)
          .set({
            seasonId: d.seasonId ?? null,
            competitionId: d.competitionId ?? null,
            matchDate: d.matchDate,
            homeTeamId: d.homeTeamId,
            awayTeamId: d.awayTeamId,
            venue: d.venue ?? null,
            recordingUrl: recordingForFixture,
            status: "PLAYED",
            updatedAt: now,
          })
          .where(eq(fixtures.id, existingSub.fixtureId!));
      }

      const [res] = await tx
        .select({ id: results.id })
        .from(results)
        .where(eq(results.fixtureId, fid))
        .limit(1);

      if (res) {
        await tx
          .update(results)
          .set({
            homeScore: d.homeScore,
            awayScore: d.awayScore,
            isVerified: true,
            verificationLevel: d.verificationLevel,
            publishedAt: now,
            updatedAt: now,
          })
          .where(eq(results.id, res.id));
      } else {
        await tx.insert(results).values({
          fixtureId: fid,
          homeScore: d.homeScore,
          awayScore: d.awayScore,
          isVerified: true,
          verificationLevel: d.verificationLevel,
          publishedAt: now,
        });
      }

      await tx
        .update(submissions)
        .set({
          moderationStatus: "APPROVED",
          reviewedAt: now,
          reviewedByUserId: actor.profileId,
          fixtureId: fid,
        })
        .where(eq(submissions.id, d.submissionId));

      await tx.insert(moderationLogs).values({
        submissionId: d.submissionId,
        moderatorUserId: actor.profileId,
        action: "APPROVED",
        reason: null,
      });

      return fid;
    });

    return { ok: true, fixtureId };
  } catch (err) {
    const chain = errorChainText(err);
    const code = postgresErrorCode(err);
    const mentionsFixtureNull =
      /fixtures/i.test(chain) &&
      (/\bcompetition_id\b/i.test(chain) || /\bseason_id\b/i.test(chain));

    const notNullViolation =
      code === "23502" ||
      /null value in column/i.test(chain) ||
      (chain.toLowerCase().includes("not null") && mentionsFixtureNull);

    if (seasonOrCompetitionOmitted && notNullViolation) {
      return { ok: false, error: FIXTURES_NULLABLE_MIGRATION_HINT };
    }

    throw err;
  }
}

export async function rejectSubmissionInDb(
  actor: ModerationActor,
  d: RejectInput
): Promise<void> {
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(submissions)
      .set({
        moderationStatus: "REJECTED",
        reviewedAt: now,
        reviewedByUserId: actor.profileId,
      })
      .where(eq(submissions.id, d.submissionId));

    await tx.insert(moderationLogs).values({
      submissionId: d.submissionId,
      moderatorUserId: actor.profileId,
      action: "REJECTED",
      reason: d.reason,
    });
  });
}

export async function flagSubmissionNeedsReviewInDb(
  actor: ModerationActor,
  submissionId: string
): Promise<void> {
  await db
    .update(submissions)
    .set({ moderationStatus: "NEEDS_REVIEW" })
    .where(eq(submissions.id, submissionId));

  await db.insert(moderationLogs).values({
    submissionId,
    moderatorUserId: actor.profileId,
    action: "NEEDS_REVIEW",
    reason: "Flagged for follow-up",
  });
}
