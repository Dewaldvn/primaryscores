import { z } from "zod";

const schoolSportEnum = z.enum(["RUGBY", "NETBALL", "HOCKEY", "SOCCER"]);
const teamGenderEnum = z.enum(["MALE", "FEMALE"]);

export const createLiveSessionSchema = z
  .object({
    homeTeamName: z.string().min(2, "Home team required").max(200),
    awayTeamName: z.string().min(2, "Away team required").max(200),
    sport: schoolSportEnum.optional().default("RUGBY"),
    teamGender: teamGenderEnum.optional().nullable(),
    homeLogoPath: z.string().max(500).nullable().optional(),
    awayLogoPath: z.string().max(500).nullable().optional(),
    venue: z.string().max(300).optional().nullable(),
    seasonId: z
      .preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable().optional()),
    competitionId: z
      .preprocess((v) => (v === "" || v == null ? null : v), z.string().uuid().nullable().optional()),
    turnstileToken: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.sport === "HOCKEY") {
      if (data.teamGender == null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Choose boys or girls for hockey.",
          path: ["teamGender"],
        });
      }
    } else if (data.teamGender != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Team gender applies to hockey only.",
        path: ["teamGender"],
      });
    }
    if (data.seasonId && data.competitionId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Choose a season or a competition, not both.",
        path: ["competitionId"],
      });
    }
  });

export const castLiveVoteSchema = z.object({
  sessionId: z.string().uuid(),
  homeScore: z.coerce.number().int().min(0).max(200),
  awayScore: z.coerce.number().int().min(0).max(200),
  turnstileToken: z.string().optional().nullable(),
});

export const submitLiveWrapupSchema = z.object({
  sessionId: z.string().uuid(),
  turnstileToken: z.string().optional().nullable(),
});

export const adminLiveSessionIdSchema = z.object({
  sessionId: z.string().uuid(),
});
