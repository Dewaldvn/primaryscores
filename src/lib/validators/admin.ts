import { z } from "zod";

export const schoolUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  officialName: z.string().min(2, "Required"),
  displayName: z.string().min(2, "Required"),
  slug: z.string().min(2).optional(),
  provinceId: z.string().uuid(),
  district: z.string().optional().nullable(),
  town: z.string().optional().nullable(),
  website: z.preprocess(
    (v) => (v === "" || v == null ? undefined : v),
    z.string().url().optional()
  ),
  active: z.coerce.boolean().optional().default(true),
});

export const teamUpsertSchema = z.object({
  id: z.string().uuid().optional(),
  schoolId: z.string().uuid(),
  ageGroup: z.string().min(1),
  teamLabel: z.string().min(1),
  isFirstTeam: z.coerce.boolean().optional().default(true),
  active: z.coerce.boolean().optional().default(true),
});

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
