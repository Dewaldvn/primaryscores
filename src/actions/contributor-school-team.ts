"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { schools, teams } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { contributorTeamBodySchema, schoolUpsertSchema } from "@/lib/validators/admin";

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

export async function contributorCreateSchoolAction(input: unknown) {
  const parsed = contributorCreateSchoolInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const { _returnTo, ...v } = parsed.data;
  await requireUser(loginRedirectForContributor(_returnTo));
  const slug = await uniqueSlugForDisplayName(v.displayName);

  const [inserted] = await db
    .insert(schools)
    .values({
      officialName: v.officialName,
      displayName: v.displayName,
      slug,
      provinceId: v.provinceId,
      district: v.district ?? null,
      town: v.town ?? null,
      website: v.website ?? null,
      active: v.active ?? true,
    })
    .returning({ id: schools.id, slug: schools.slug, displayName: schools.displayName });

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
        eq(teams.teamLabel, v.teamLabel),
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
      isFirstTeam: v.isFirstTeam,
      active: v.active,
    })
    .returning({ id: teams.id });

  return { ok: true as const, teamId: inserted.id, schoolSlug: school.slug };
}
