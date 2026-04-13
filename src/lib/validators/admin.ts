import { z } from "zod";
import { normalizeAgeGroupInput } from "@/lib/age-group";

const schoolSportEnum = z.enum(["RUGBY", "NETBALL", "HOCKEY", "SOCCER"]);
const teamGenderEnum = z.enum(["MALE", "FEMALE"]);

export const schoolUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  officialName: z.string().min(2, "Required"),
  displayName: z.string().min(2, "Required"),
  nickname: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().max(120).nullable().optional()
  ),
  slug: z.string().min(2).optional(),
  provinceId: z.string().uuid(),
  town: z.string().optional().nullable(),
  website: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().url().optional()
  ),
  active: z.coerce.boolean().optional().default(true),
});

/** Plain object shape for team create/update (refinements applied separately). */
export const teamUpsertObjectSchema = z.object({
  id: z.string().uuid().optional(),
  schoolId: z.string().uuid(),
  sport: schoolSportEnum.optional().default("RUGBY"),
  gender: z.preprocess(
    (v) => (v === "" || v == null || v === "__none__" ? null : v),
    teamGenderEnum.nullable().optional()
  ),
  ageGroup: z.preprocess(
    (v) => normalizeAgeGroupInput(v),
    z.string().min(2, "Complete the age group after U (e.g. U13)")
  ),
  teamLabel: z.preprocess(
    (v) => (typeof v === "string" ? v.trim().toUpperCase() : v),
    z.string().min(1, "Team label is required")
  ),
  teamNickname: z.preprocess(
    (v) => (v === "" || v == null ? null : String(v).trim()),
    z.string().max(120).nullable().optional()
  ),
  isFirstTeam: z.coerce.boolean().optional().default(true),
  active: z.coerce.boolean().optional().default(true),
});

function refineTeamHockeyGender(data: z.infer<typeof teamUpsertObjectSchema>, ctx: z.RefinementCtx) {
  if (data.sport === "HOCKEY" && data.gender == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Gender is required for hockey teams (boys or girls side).",
      path: ["gender"],
    });
  }
  if (data.sport !== "HOCKEY" && data.gender != null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Gender is only used for hockey; leave unset for other sports.",
      path: ["gender"],
    });
  }
}

export const teamUpsertSchema = teamUpsertObjectSchema.superRefine(refineTeamHockeyGender);

/** Contributor create-team payload (no `id`). Cannot use `.omit()` on `teamUpsertSchema` because of refinements. */
export const contributorTeamBodySchema = teamUpsertObjectSchema
  .omit({ id: true })
  .superRefine(refineTeamHockeyGender);

export const seasonUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  year: z.coerce.number().int().min(1990).max(2100),
  name: z.string().min(2),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
});

export const competitionUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(2),
  provinceId: z.preprocess(
    (v) => (v === "" || v == null ? null : v),
    z.string().uuid().nullable()
  ),
  organiser: z.string().optional().nullable(),
  level: z.string().optional().nullable(),
  active: z.coerce.boolean().optional().default(true),
});

export const adminResultUpdateSchema = z.object({
  resultId: z.string().uuid(),
  homeScore: z.coerce.number().int().min(0).max(500),
  awayScore: z.coerce.number().int().min(0).max(500),
  matchDate: z.string().min(1, "Match date required"),
  venue: z.preprocess(
    (v) => (v === "" || v == null ? null : String(v).trim() || null),
    z.string().nullable().optional()
  ),
  recordingUrl: z.preprocess(
    (v) => (v === "" || v == null ? null : String(v).trim() || null),
    z.union([z.string().url(), z.null()])
  ),
  isVerified: z.coerce.boolean(),
  verificationLevel: z.enum(["SUBMITTED", "MODERATOR_VERIFIED", "SOURCE_VERIFIED"]),
});
