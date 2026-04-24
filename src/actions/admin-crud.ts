"use server";

import { and, eq, inArray, ne, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { competitions, fixtures, schools, seasons, teams } from "@/db/schema";
import { schoolsHasNicknameColumn, schoolsSelectColumns } from "@/lib/school-db-support";
import { requireRole } from "@/lib/auth";
import { slugify } from "@/lib/slug";
import { SCHOOL_SPORTS } from "@/lib/sports";
import { DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE } from "@/lib/school-default-teams";
import {
  getActiveManagedSchoolIds,
  profileManagesSchool,
  schoolAdminCanUpsertTeam,
} from "@/lib/school-admin-access";
import {
  competitionUpsertSchema,
  schoolUpsertSchema,
  seasonUpsertSchema,
  teamUpsertSchema,
} from "@/lib/validators/admin";

function seasonBoundsFromYear(year: number): { startDate: string; endDate: string } {
  return {
    startDate: `${year}-01-01`,
    endDate: `${year}-12-31`,
  };
}

function teamPartsFromCode(code: string): { ageGroup: string; teamLabel: string } {
  const m = /^([A-Z0-9]+?)([A-Z])$/.exec(code);
  if (!m) return { ageGroup: code, teamLabel: "A" };
  return { ageGroup: m[1], teamLabel: m[2] };
}

const ALLOWED_AGE_GROUPS_BY_SCHOOL_TYPE = {
  PRIMARY: new Set(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE.PRIMARY.map((code) => teamPartsFromCode(code).ageGroup)),
  SECONDARY: new Set(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE.SECONDARY.map((code) => teamPartsFromCode(code).ageGroup)),
  COMBINED: new Set(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE.COMBINED.map((code) => teamPartsFromCode(code).ageGroup)),
} as const;

function buildDefaultTeamsForSchool(
  schoolId: string,
  schoolType: keyof typeof DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE,
  selectedCodes?: string[],
  selectedSports?: readonly (typeof SCHOOL_SPORTS)[number][],
) {
  const codes = selectedCodes?.length ? selectedCodes : DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[schoolType];
  const sports = selectedSports?.length ? selectedSports : SCHOOL_SPORTS;
  return sports.flatMap((sport) =>
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

function teamRowKey(r: { sport: string; ageGroup: string; teamLabel: string; gender?: string | null }) {
  return `${r.sport}\0${r.ageGroup}\0${r.teamLabel}\0${r.gender ?? ""}`;
}

/** Inserts default team rows for this school, skipping any that already exist. */
async function insertMissingDefaultTeamsForSchool(
  schoolId: string,
  schoolType: keyof typeof DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE,
  selectedCodes: string[],
  selectedSports: readonly (typeof SCHOOL_SPORTS)[number][],
) {
  const built = buildDefaultTeamsForSchool(schoolId, schoolType, selectedCodes, selectedSports);
  if (built.length === 0) return;

  const existing = await db
    .select({ sport: teams.sport, ageGroup: teams.ageGroup, teamLabel: teams.teamLabel, gender: teams.gender })
    .from(teams)
    .where(eq(teams.schoolId, schoolId));
  const existingSet = new Set(existing.map((r) => teamRowKey(r)));
  const toInsert = built.filter((r) => !existingSet.has(teamRowKey(r)));
  if (toInsert.length > 0) {
    await db.insert(teams).values(toInsert);
  }
}

export async function upsertSchoolAction(input: unknown) {
  const { profile } = await requireRole(["ADMIN", "SCHOOL_ADMIN"]);
  const parsed = schoolUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  const slug = v.slug?.trim() || slugify(v.displayName);
  const now = new Date();

  if (v.id) {
    const schoolId = v.id;
    if (profile.role === "SCHOOL_ADMIN") {
      const manages = await profileManagesSchool(profile.id, schoolId);
      if (!manages) {
        return { ok: false as const, error: "You can only edit your linked school." };
      }
      const includeNick = await schoolsHasNicknameColumn();
      const [sch] = await db
        .select(schoolsSelectColumns(includeNick))
        .from(schools)
        .where(eq(schools.id, schoolId))
        .limit(1);
      if (!sch) {
        return { ok: false as const, error: "School not found." };
      }
      await db
        .update(schools)
        .set({
          officialName: v.officialName,
          displayName: v.displayName,
          ...(includeNick ? { nickname: v.nickname ?? null } : {}),
          schoolType: sch.schoolType,
          slug: sch.slug,
          provinceId: v.provinceId,
          town: v.town ?? null,
          website: v.website ?? null,
          active: sch.active,
          updatedAt: now,
        })
        .where(eq(schools.id, schoolId));
      return { ok: true as const, id: schoolId };
    }

    const includeNickAdmin = await schoolsHasNicknameColumn();
    const [rowBefore] = await db
      .select({ schoolType: schools.schoolType })
      .from(schools)
      .where(eq(schools.id, schoolId))
      .limit(1);
    if (!rowBefore) {
      return { ok: false as const, error: "School not found." };
    }
    const allowedAgeGroups = ALLOWED_AGE_GROUPS_BY_SCHOOL_TYPE[v.schoolType];
    const typeChanged = rowBefore.schoolType !== v.schoolType;
    const existingTeams = typeChanged
      ? await db
          .select({ id: teams.id, ageGroup: teams.ageGroup })
          .from(teams)
          .where(eq(teams.schoolId, schoolId))
      : [];
    const disallowedTeamIds = typeChanged
      ? existingTeams
          .filter((t) => !allowedAgeGroups.has(String(t.ageGroup).trim().toUpperCase()))
          .map((t) => t.id)
      : [];

    try {
      await db.transaction(async (tx) => {
        await tx
          .update(schools)
          .set({
            officialName: v.officialName,
            displayName: v.displayName,
            ...(includeNickAdmin ? { nickname: v.nickname ?? null } : {}),
            schoolType: v.schoolType,
            slug,
            provinceId: v.provinceId,
            town: v.town ?? null,
            website: v.website ?? null,
            active: v.active,
            updatedAt: now,
          })
          .where(eq(schools.id, schoolId));

        if (disallowedTeamIds.length > 0) {
          await tx.delete(teams).where(inArray(teams.id, disallowedTeamIds));
        }
      });
    } catch (e) {
      if (typeChanged && disallowedTeamIds.length > 0) {
        const blocked = await db
          .select({
            id: teams.id,
            sport: teams.sport,
            ageGroup: teams.ageGroup,
            teamLabel: teams.teamLabel,
            fixtureCount: sql<number>`(
              select count(*)
              from ${fixtures}
              where ${fixtures.homeTeamId} = ${teams.id}
                 or ${fixtures.awayTeamId} = ${teams.id}
            )`,
          })
          .from(teams)
          .where(inArray(teams.id, disallowedTeamIds));
        const blockedForUi = blocked.map((b) => ({
          sport: b.sport,
          ageGroup: b.ageGroup,
          teamLabel: b.teamLabel,
          fixtureCount: Number(b.fixtureCount),
        }));
        const inUse = blockedForUi.filter((b) => b.fixtureCount > 0);
        const detail =
          inUse.length > 0
            ? ` In use: ${inUse.map((b) => `${b.sport} ${b.ageGroup}${b.teamLabel} (${b.fixtureCount})`).join(", ")}.`
            : "";
        return {
          ok: false as const,
          error:
            "Could not remove teams that are invalid for the selected school type because they are linked to fixtures/results or other records." +
            detail +
            " Reassign/remove those references first, then update the school type.",
          blockedTeams: blockedForUi,
          schoolId,
        };
      }
      const msg = e instanceof Error ? e.message : "Could not update school.";
      return { ok: false as const, error: msg };
    }

    if (v.defaultTeamCodes && v.defaultTeamCodes.length > 0) {
      const allowedCodes = new Set<string>(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[v.schoolType]);
      const selectedCodes = v.defaultTeamCodes.filter((code) => allowedCodes.has(code));
      const allowedSports = new Set<string>(SCHOOL_SPORTS);
      const selectedSports = (v.defaultTeamSports ?? SCHOOL_SPORTS).filter((sport) => allowedSports.has(sport));
      if (selectedCodes.length > 0 && selectedSports.length > 0) {
        await insertMissingDefaultTeamsForSchool(schoolId, v.schoolType, selectedCodes, selectedSports);
      }
    }
    revalidatePath("/admin/schools");
    revalidatePath("/admin/teams");
    return { ok: true as const, id: schoolId };
  }

  if (profile.role !== "ADMIN") {
    return { ok: false as const, error: "Only administrators can create new schools." };
  }

  const includeNickCreate = await schoolsHasNicknameColumn();
  const [inserted] = await db
    .insert(schools)
    .values({
      officialName: v.officialName,
      displayName: v.displayName,
      ...(includeNickCreate ? { nickname: v.nickname ?? null } : {}),
      schoolType: v.schoolType,
      slug,
      provinceId: v.provinceId,
      town: v.town ?? null,
      website: v.website ?? null,
      active: v.active,
    })
    .returning({ id: schools.id });

  const allowedCodes = new Set<string>(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[v.schoolType]);
  const selectedCodes = (v.defaultTeamCodes ?? DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[v.schoolType]).filter((code) =>
    allowedCodes.has(code),
  );
  const allowedSports = new Set<string>(SCHOOL_SPORTS);
  const selectedSports = (v.defaultTeamSports ?? SCHOOL_SPORTS).filter((sport) => allowedSports.has(sport));
  if (selectedCodes.length > 0 && selectedSports.length > 0) {
    await db.insert(teams).values(buildDefaultTeamsForSchool(inserted.id, v.schoolType, selectedCodes, selectedSports));
  }

  return { ok: true as const, id: inserted.id };
}

export async function upsertTeamAction(input: unknown) {
  const { profile } = await requireRole(["ADMIN", "SCHOOL_ADMIN"]);
  const parsed = teamUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  const now = new Date();
  const teamGender = v.sport === "HOCKEY" ? (v.gender ?? null) : null;

  const managedSchoolIds =
    profile.role === "SCHOOL_ADMIN" ? await getActiveManagedSchoolIds(profile.id) : [];

  if (profile.role === "SCHOOL_ADMIN") {
    if (managedSchoolIds.length === 0) {
      return { ok: false as const, error: "You need an approved school link before managing teams." };
    }
    const allowed = await schoolAdminCanUpsertTeam(managedSchoolIds, {
      id: v.id,
      schoolId: v.schoolId,
    });
    if (!allowed) {
      return { ok: false as const, error: "You can only manage teams for your linked school(s)." };
    }
  }

  const duplicateBase = and(
    eq(teams.schoolId, v.schoolId),
    eq(teams.sport, v.sport),
    eq(teams.ageGroup, v.ageGroup),
    sql`upper(${teams.teamLabel}) = upper(${v.teamLabel})`,
    sql`${teams.gender} is not distinct from ${teamGender}`,
  );
  const duplicateWhere = v.id ? and(duplicateBase, ne(teams.id, v.id)) : duplicateBase;
  const [dup] = await db
    .select({ id: teams.id })
    .from(teams)
    .where(duplicateWhere)
    .limit(1);
  if (dup) {
    return {
      ok: false as const,
      error: "That team already exists for this school, sport, age group, and side.",
    };
  }

  if (v.id) {
    await db
      .update(teams)
      .set({
        schoolId: v.schoolId,
        sport: v.sport,
        gender: teamGender,
        ageGroup: v.ageGroup,
        teamLabel: v.teamLabel,
        teamNickname: v.teamNickname ?? null,
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
      sport: v.sport,
      gender: teamGender,
      ageGroup: v.ageGroup,
      teamLabel: v.teamLabel,
      teamNickname: v.teamNickname ?? null,
      isFirstTeam: v.isFirstTeam,
      active: v.active,
    })
    .returning({ id: teams.id });

  return { ok: true as const, id: inserted.id };
}

export async function deleteTeamAction(input: unknown) {
  const { profile } = await requireRole(["ADMIN", "SCHOOL_ADMIN"]);
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const teamId = parsed.data.id;

  const [existing] = await db
    .select({ id: teams.id, schoolId: teams.schoolId })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!existing) {
    return { ok: false as const, error: "Team not found." };
  }

  if (profile.role === "SCHOOL_ADMIN") {
    const managedSchoolIds = await getActiveManagedSchoolIds(profile.id);
    if (!managedSchoolIds.includes(existing.schoolId)) {
      return { ok: false as const, error: "You can only delete teams for your linked school(s)." };
    }
  }

  try {
    await db.delete(teams).where(eq(teams.id, teamId));
  } catch {
    return {
      ok: false as const,
      error: "This team is used by existing fixtures/results and cannot be deleted. Mark it inactive instead.",
    };
  }

  revalidatePath("/admin/teams");
  revalidatePath("/school-admin/teams");
  return { ok: true as const };
}

export async function bulkDeleteTeamsAction(input: unknown) {
  const { profile } = await requireRole(["ADMIN", "SCHOOL_ADMIN"]);
  const parsed = z
    .object({
      ids: z.array(z.string().uuid()).min(1, "Select at least one team."),
    })
    .safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors, error: "Invalid team selection." };
  }

  const ids = Array.from(new Set(parsed.data.ids));
  const existing = await db
    .select({ id: teams.id, schoolId: teams.schoolId })
    .from(teams)
    .where(inArray(teams.id, ids));
  if (existing.length === 0) {
    return { ok: false as const, error: "No matching teams found." };
  }

  if (profile.role === "SCHOOL_ADMIN") {
    const managedSchoolIds = await getActiveManagedSchoolIds(profile.id);
    const unauthorized = existing.some((t) => !managedSchoolIds.includes(t.schoolId));
    if (unauthorized) {
      return { ok: false as const, error: "You can only delete teams for your linked school(s)." };
    }
  }

  try {
    await db.delete(teams).where(inArray(teams.id, existing.map((x) => x.id)));
  } catch {
    return {
      ok: false as const,
      error:
        "One or more selected teams are used by fixtures/results and cannot be deleted. Remove linked records first or mark those teams inactive.",
    };
  }

  revalidatePath("/admin/teams");
  revalidatePath("/school-admin/teams");
  return { ok: true as const, deletedCount: existing.length };
}

export async function deleteSchoolAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = z.object({ id: z.string().uuid() }).safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const schoolId = parsed.data.id;
  const [existing] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.id, schoolId))
    .limit(1);
  if (!existing) {
    return { ok: false as const, error: "School not found." };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(teams).where(eq(teams.schoolId, schoolId));
      await tx.delete(schools).where(eq(schools.id, schoolId));
    });
  } catch {
    return {
      ok: false as const,
      error:
        "This school has teams linked to fixtures/results and cannot be deleted. Merge it or remove linked records first.",
    };
  }

  revalidatePath("/admin/schools");
  revalidatePath("/admin/teams");
  revalidatePath("/admin/scores");
  return { ok: true as const };
}

export async function upsertSeasonAction(input: unknown) {
  await requireRole(["ADMIN"]);
  const parsed = seasonUpsertSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  const bounds = seasonBoundsFromYear(v.year);

  if (v.id) {
    await db
      .update(seasons)
      .set({
        sport: v.sport,
        provinceId: v.provinceId,
        year: v.year,
        name: v.name,
        startDate: bounds.startDate,
        endDate: bounds.endDate,
      })
      .where(eq(seasons.id, v.id));
    return { ok: true as const, id: v.id };
  }

  const [inserted] = await db
    .insert(seasons)
    .values({
      sport: v.sport,
      provinceId: v.provinceId,
      year: v.year,
      name: v.name,
      startDate: bounds.startDate,
      endDate: bounds.endDate,
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
        sport: v.sport,
        year: v.year,
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
      sport: v.sport,
      year: v.year,
      provinceId: v.provinceId,
      organiser: v.organiser ?? null,
      level: v.level ?? null,
      active: v.active,
    })
    .returning({ id: competitions.id });

  return { ok: true as const, id: inserted.id };
}
