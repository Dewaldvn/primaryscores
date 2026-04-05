"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { competitions, schools, seasons, teams } from "@/db/schema";
import { requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import {
  competitionUpsertSchema,
  schoolUpsertSchema,
  seasonUpsertSchema,
  teamUpsertSchema,
} from "@/lib/validators/admin";

export async function upsertSchoolAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = schoolUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  const slug = v.slug?.trim() || slugify(v.displayName);
  const now = new Date();

  if (v.id) {
    await db
      .update(schools)
      .set({
        officialName: v.officialName,
        displayName: v.displayName,
        slug,
        provinceId: v.provinceId,
        district: v.district ?? null,
        town: v.town ?? null,
        website: v.website ?? null,
        active: v.active,
        updatedAt: now,
      })
      .where(eq(schools.id, v.id));
    return { ok: true as const, id: v.id };
  }

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
      active: v.active,
    })
    .returning({ id: schools.id });

  await db.insert(teams).values({
    schoolId: inserted.id,
    ageGroup: "U13",
    teamLabel: "A",
    isFirstTeam: true,
    active: true,
  });

  return { ok: true as const, id: inserted.id };
}

export async function upsertTeamAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = teamUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  const now = new Date();

  if (v.id) {
    await db
      .update(teams)
      .set({
        schoolId: v.schoolId,
        ageGroup: v.ageGroup,
        teamLabel: v.teamLabel,
        isFirstTeam: v.isFirstTeam,
        active: v.active,
        updatedAt: now,
      })
      .where(eq(teams.id, v.id));
    return { ok: true as const, id: v.id };
  }

  const [inserted] = await db
    .insert(teams)
    .values({
      schoolId: v.schoolId,
      ageGroup: v.ageGroup,
      teamLabel: v.teamLabel,
      isFirstTeam: v.isFirstTeam,
      active: v.active,
    })
    .returning({ id: teams.id });

  return { ok: true as const, id: inserted.id };
}

export async function upsertSeasonAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = seasonUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;

  if (v.id) {
    await db
      .update(seasons)
      .set({
        year: v.year,
        name: v.name,
        startDate: v.startDate,
        endDate: v.endDate,
      })
      .where(eq(seasons.id, v.id));
    return { ok: true as const, id: v.id };
  }

  const [inserted] = await db
    .insert(seasons)
    .values({
      year: v.year,
      name: v.name,
      startDate: v.startDate,
      endDate: v.endDate,
    })
    .returning({ id: seasons.id });

  return { ok: true as const, id: inserted.id };
}

export async function upsertCompetitionAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = competitionUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;

  if (v.id) {
    await db
      .update(competitions)
      .set({
        name: v.name,
        provinceId: v.provinceId,
        organiser: v.organiser ?? null,
        level: v.level ?? null,
        active: v.active,
      })
      .where(eq(competitions.id, v.id));
    return { ok: true as const, id: v.id };
  }

  const [inserted] = await db
    .insert(competitions)
    .values({
      name: v.name,
      provinceId: v.provinceId,
      organiser: v.organiser ?? null,
      level: v.level ?? null,
      active: v.active,
    })
    .returning({ id: competitions.id });

  return { ok: true as const, id: inserted.id };
}
