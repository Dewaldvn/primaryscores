import { z } from "zod";

const optionalUuid = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.string().uuid().optional()
);

const optionalHttpUrl = z
  .string()
  .url()
  .optional()
  .or(z.literal(""))
  .transform((v) => (v === "" ? undefined : v));

export const submitScoreSchema = z.object({
  proposedMatchDate: z.string().min(1, "Match date required"),
  proposedHomeTeamId: optionalUuid,
  proposedAwayTeamId: optionalUuid,
  proposedHomeTeamName: z.string().min(1, "Home team / school required"),
  proposedAwayTeamName: z.string().min(1, "Away team / school required"),
  proposedHomeScore: z.coerce.number().int().min(0).max(200),
  proposedAwayScore: z.coerce.number().int().min(0).max(200),
  proposedProvinceId: optionalUuid,
  proposedSeasonId: optionalUuid,
  proposedCompetitionId: optionalUuid,
  proposedVenue: z.string().optional().nullable(),
  sourceUrl: optionalHttpUrl,
  recordingUrl: optionalHttpUrl,
  notes: z.string().max(5000).optional().nullable(),
  /** When true, submission and resulting score are treated as test/dummy data. */
  isDummy: z.boolean().optional().default(false),
  turnstileToken: z.string().optional().nullable(),
});

export const moderationApproveSchema = z.object({
  submissionId: z.string().uuid(),
  homeTeamId: z.string().uuid(),
  awayTeamId: z.string().uuid(),
  seasonId: optionalUuid,
  competitionId: optionalUuid,
  matchDate: z.string().min(1),
  homeScore: z.coerce.number().int().min(0),
  awayScore: z.coerce.number().int().min(0),
  venue: z.string().optional().nullable(),
  verificationLevel: z.enum(["MODERATOR_VERIFIED", "SOURCE_VERIFIED"]),
});

export const moderationRejectSchema = z.object({
  submissionId: z.string().uuid(),
  reason: z.string().min(3, "Please provide a short reason"),
});

export const moderationBulkRejectSchema = z.object({
  submissionIds: z.array(z.string().uuid()).min(1).max(50),
  reason: z.string().min(3, "Please provide a short reason"),
});

export const moderationBulkApproveSchema = z.object({
  submissionIds: z.array(z.string().uuid()).min(1).max(50),
  verificationLevel: z.enum(["MODERATOR_VERIFIED", "SOURCE_VERIFIED"]),
});
