"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { schools, teams } from "@/db/schema";
import { schoolsHasNicknameColumn } from "@/lib/school-db-support";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { contributorTeamBodySchema, schoolUpsertSchema } from "@/lib/validators/admin";
import { SCHOOL_SPORTS } from "@/lib/sports";
import { DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE } from "@/lib/school-default-teams";

const contributorSchoolSchema = schoolUpsertSchema.omit({ id: true });

const contributorReturnToSchema = z.enum(["find-school", "add-team"]).optional();

const contributorCreateSchoolInputSchema = contributorSchoolSchema.extend({
  _returnTo: contributorReturnToSchema,
});

const contributorCreateTeamInputSchema = contributorTeamBodySchema.extend({
  _returnTo: contributorReturnToSchema,
});

function loginRedirectForContributor(returnTo: z.infer<typeof contributorReturnToSchema>) {
  return returnTo === "find-school" ? "/login?redirect=%2Ffind-school" : "/login?redirect=%2Fadd-team";
}

async function uniqueSlugForDisplayName(displayName: string): Promise<string> {
  const base = slugify(displayName);
  let slug = base;
  for (let n = 0; n < 60; n += 1) {
    const existing = await db.select({ id: schools.id }).from(schools).where(eq(schools.slug, slug)).limit(1);
    if (existing.length === 0) return slug;
    slug = n === 0 ? `${base}-2` : `${base}-${n + 2}`;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

function teamPartsFromCode(code: string): { ageGroup: string; teamLabel: string } {
  const m = /^([A-Z0-9]+?)([A-Z])$/.exec(code);
  if (!m) return { ageGroup: code, teamLabel: "A" };
  return { ageGroup: m[1], teamLabel: m[2] };
}

function buildDefaultTeamsForSchool(
  schoolId: string,
  schoolType: keyof typeof DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE,
  selectedCodes?: string[],
) {
  const codes = selectedCodes?.length ? selectedCodes : DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[schoolType];
  return SCHOOL_SPORTS.flatMap((sport) =>
    codes.map((code) => {
      const { ageGroup, teamLabel } = teamPartsFromCode(code);
      return {
        schoolId,
        sport,
        ageGroup,
        teamLabel,
        isFirstTeam: teamLabel === "A",
        active: true,
      };
    }),
  );
}

export async function contributorCreateSchoolAction(input: unknown) {
  const parsed = contributorCreateSchoolInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { _returnTo, ...v } = parsed.data;
  await requireUser(loginRedirectForContributor(_returnTo));
  const slug = await uniqueSlugForDisplayName(v.displayName);

  const includeNickContributor = await schoolsHasNicknameColumn();
  const [inserted] = await db
    .insert(schools)
    .values({
      officialName: v.officialName,
      displayName: v.displayName,
      ...(includeNickContributor ? { nickname: null } : {}),
      schoolType: v.schoolType,
      slug,
      provinceId: v.provinceId,
      town: v.town ?? null,
      website: v.website ?? null,
      active: v.active ?? true,
    })
    .returning({ id: schools.id, slug: schools.slug, displayName: schools.displayName });

  const allowedCodes = new Set<string>(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[v.schoolType]);
  const selectedCodes = (v.defaultTeamCodes ?? DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[v.schoolType]).filter((code) =>
    allowedCodes.has(code),
  );
  if (selectedCodes.length > 0) {
    await db.insert(teams).values(buildDefaultTeamsForSchool(inserted.id, v.schoolType, selectedCodes));
  }

  return { ok: true as const, schoolId: inserted.id, slug: inserted.slug, displayName: inserted.displayName };
}

export async function contributorCreateTeamAction(input: unknown) {
  const parsed = contributorCreateTeamInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { _returnTo, ...v } = parsed.data;
  await requireUser(loginRedirectForContributor(_returnTo));

  const [school] = await db
    .select({ id: schools.id, slug: schools.slug, active: schools.active })
    .from(schools)
    .where(eq(schools.id, v.schoolId))
    .limit(1);
  if (!school?.active) {
    return { ok: false as const, error: "School not found or inactive." };
  }

  const gender = v.sport === "HOCKEY" ? (v.gender ?? null) : null;
  const dup = await db
    .select({ id: teams.id })
    .from(teams)
    .where(
      and(
        eq(teams.schoolId, v.schoolId),
        eq(teams.sport, v.sport),
        eq(teams.ageGroup, v.ageGroup),
        sql`upper(${teams.teamLabel}) = upper(${v.teamLabel})`,
        sql`${teams.gender} is not distinct from ${gender}`
      )
    )
    .limit(1);
  if (dup.length > 0) {
    return { ok: false as const, error: "That team is already listed for this school." };
  }

  const [inserted] = await db
    .insert(teams)
    .values({
      schoolId: v.schoolId,
      sport: v.sport,
      gender,
      ageGroup: v.ageGroup,
      teamLabel: v.teamLabel,
      teamNickname: v.teamNickname ?? null,
      isFirstTeam: v.isFirstTeam,
      active: v.active,
    })
    .returning({ id: teams.id });

  return { ok: true as const, teamId: inserted.id, schoolSlug: school.slug };
}
