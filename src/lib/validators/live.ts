import { z } from "zod";

export const createLiveSessionSchema = z.object({
  homeTeamName: z.string().min(2, "Home team required").max(200),
  awayTeamName: z.string().min(2, "Away team required").max(200),
  homeLogoPath: z.string().max(500).nullable().optional(),
  awayLogoPath: z.string().max(500).nullable().optional(),
  venue: z.string().max(300).optional().nullable(),
  turnstileToken: z.string().optional().nullable(),
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
