import { cache } from "react";
import { and, desc, eq, ilike, or, sql, count } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  schools,
  teams,
  provinces,
  fixtures,
  results,
  seasons,
} from "@/db/schema";

const homeTeam = alias(teams, "home_team_m");
const awayTeam = alias(teams, "away_team_m");
const homeSchool = alias(schools, "home_school_m");
const awaySchool = alias(schools, "away_school_m");

export const listProvinces = cache(async function listProvinces() {
  return db.select().from(provinces).orderBy(provinces.name);
});

export async function searchSchools(q: string, limit = 30) {
  const term = `%${q.trim()}%`;
  if (q.trim().length < 2) return [];
  return db
    .select({
      id: schools.id,
      displayName: schools.displayName,
      slug: schools.slug,
      town: schools.town,
      provinceName: provinces.name,
      logoPath: schools.logoPath,
      u13TeamId: teams.id,
    })
    .from(schools)
    .innerJoin(provinces, eq(schools.provinceId, provinces.id))
    .leftJoin(
      teams,
      and(
        eq(teams.schoolId, schools.id),
        eq(teams.ageGroup, "U13"),
        eq(teams.active, true)
      )
    )
    .where(
      and(
        eq(schools.active, true),
        or(ilike(schools.displayName, term), ilike(schools.officialName, term))!
      )
    )
    .orderBy(schools.displayName)
    .limit(limit);
}

export async function getSchoolBySlug(slug: string) {
  const [row] = await db
    .select({
      id: schools.id,
      officialName: schools.officialName,
      displayName: schools.displayName,
      slug: schools.slug,
      district: schools.district,
      town: schools.town,
      website: schools.website,
      logoPath: schools.logoPath,
      provinceId: schools.provinceId,
      provinceName: provinces.name,
    })
    .from(schools)
    .innerJoin(provinces, eq(schools.provinceId, provinces.id))
    .where(and(eq(schools.slug, slug), eq(schools.active, true)))
    .limit(1);
  return row ?? null;
}

export async function getU13TeamsForSchool(schoolId: string) {
  return db
    .select()
    .from(teams)
    .where(
      and(
        eq(teams.schoolId, schoolId),
        eq(teams.active, true),
        eq(teams.ageGroup, "U13")
      )
    );
}

export async function getVerifiedResultsForSchool(schoolId: string, limit = 50) {
  return db
    .select({
      resultId: results.id,
      fixtureId: fixtures.id,
      homeScore: results.homeScore,
      awayScore: results.awayScore,
      verificationLevel: results.verificationLevel,
      matchDate: fixtures.matchDate,
      homeSchoolName: homeSchool.displayName,
      awaySchoolName: awaySchool.displayName,
      homeSchoolSlug: homeSchool.slug,
      awaySchoolSlug: awaySchool.slug,
      homeSchoolLogoPath: homeSchool.logoPath,
      awaySchoolLogoPath: awaySchool.logoPath,
      isHome: sql<boolean>`${homeSchool.id} = ${schoolId}`,
    })
    .from(results)
    .innerJoin(fixtures, eq(results.fixtureId, fixtures.id))
    .innerJoin(homeTeam, eq(fixtures.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(fixtures.awayTeamId, awayTeam.id))
    .innerJoin(homeSchool, eq(homeTeam.schoolId, homeSchool.id))
    .innerJoin(awaySchool, eq(awayTeam.schoolId, awaySchool.id))
    .where(
      and(
        eq(results.isVerified, true),
        sql`${results.publishedAt} is not null`,
        or(eq(homeTeam.schoolId, schoolId), eq(awayTeam.schoolId, schoolId))!
      )
    )
    .orderBy(desc(fixtures.matchDate))
    .limit(limit);
}

export async function getSchoolSeasonSummary(schoolId: string) {
  const rows = await db
    .select({
      seasonId: fixtures.seasonId,
      seasonName: seasons.name,
      seasonYear: seasons.year,
      played: count(),
    })
    .from(results)
    .innerJoin(fixtures, eq(results.fixtureId, fixtures.id))
    .leftJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(homeTeam, eq(fixtures.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(fixtures.awayTeamId, awayTeam.id))
    .where(
      and(
        eq(results.isVerified, true),
        sql`${results.publishedAt} is not null`,
        or(eq(homeTeam.schoolId, schoolId), eq(awayTeam.schoolId, schoolId))!
      )
    )
    .groupBy(fixtures.seasonId, seasons.name, seasons.year)
    .orderBy(desc(seasons.year));

  return rows;
}
