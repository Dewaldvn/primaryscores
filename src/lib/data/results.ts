import { cache } from "react";
import {
  and,
  desc,
  eq,
  gte,
  lte,
  ilike,
  or,
  sql,
  count,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import {
  results,
  fixtures,
  teams,
  schools,
  seasons,
  competitions,
  provinces,
} from "@/db/schema";

const homeTeam = alias(teams, "home_team");
const awayTeam = alias(teams, "away_team");
const homeSchool = alias(schools, "home_school");
const awaySchool = alias(schools, "away_school");

export type ResultListFilters = {
  provinceId?: string;
  schoolId?: string;
  seasonId?: string;
  competitionId?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  page?: number;
  pageSize?: number;
};

function verifiedCondition() {
  return and(eq(results.isVerified, true), sql`${results.publishedAt} is not null`);
}

export const getRecentVerifiedResults = cache(async function getRecentVerifiedResults(limit = 10) {
  return db
    .select({
      resultId: results.id,
      fixtureId: fixtures.id,
      homeScore: results.homeScore,
      awayScore: results.awayScore,
      verificationLevel: results.verificationLevel,
      publishedAt: results.publishedAt,
      matchDate: fixtures.matchDate,
      homeSchoolName: homeSchool.displayName,
      awaySchoolName: awaySchool.displayName,
      homeSchoolSlug: homeSchool.slug,
      awaySchoolSlug: awaySchool.slug,
      homeSchoolLogoPath: homeSchool.logoPath,
      awaySchoolLogoPath: awaySchool.logoPath,
      competitionName: competitions.name,
      seasonName: seasons.name,
      provinceName: provinces.name,
      recordingUrl: fixtures.recordingUrl,
    })
    .from(results)
    .innerJoin(fixtures, eq(results.fixtureId, fixtures.id))
    .leftJoin(competitions, eq(fixtures.competitionId, competitions.id))
    .leftJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(homeTeam, eq(fixtures.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(fixtures.awayTeamId, awayTeam.id))
    .innerJoin(homeSchool, eq(homeTeam.schoolId, homeSchool.id))
    .innerJoin(awaySchool, eq(awayTeam.schoolId, awaySchool.id))
    .leftJoin(provinces, eq(competitions.provinceId, provinces.id))
    .where(verifiedCondition())
    .orderBy(desc(results.publishedAt))
    .limit(limit);
});

export async function countVerifiedResults(filters: ResultListFilters) {
  const conditions = buildFilterConditions(filters);
  const whereClause = conditions
    ? and(verifiedCondition(), conditions)
    : verifiedCondition();
  const [row] = await db
    .select({ n: count() })
    .from(results)
    .innerJoin(fixtures, eq(results.fixtureId, fixtures.id))
    .leftJoin(competitions, eq(fixtures.competitionId, competitions.id))
    .leftJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(homeTeam, eq(fixtures.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(fixtures.awayTeamId, awayTeam.id))
    .innerJoin(homeSchool, eq(homeTeam.schoolId, homeSchool.id))
    .innerJoin(awaySchool, eq(awayTeam.schoolId, awaySchool.id))
    .where(whereClause);
  return row?.n ?? 0;
}

export async function listVerifiedResults(filters: ResultListFilters) {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 15));
  const offset = (page - 1) * pageSize;
  const conditions = buildFilterConditions(filters);
  const whereClause = conditions
    ? and(verifiedCondition(), conditions)
    : verifiedCondition();

  const rows = await db
    .select({
      resultId: results.id,
      fixtureId: fixtures.id,
      homeScore: results.homeScore,
      awayScore: results.awayScore,
      verificationLevel: results.verificationLevel,
      publishedAt: results.publishedAt,
      matchDate: fixtures.matchDate,
      homeSchoolName: homeSchool.displayName,
      awaySchoolName: awaySchool.displayName,
      homeSchoolSlug: homeSchool.slug,
      awaySchoolSlug: awaySchool.slug,
      homeSchoolLogoPath: homeSchool.logoPath,
      awaySchoolLogoPath: awaySchool.logoPath,
      competitionName: competitions.name,
      seasonName: seasons.name,
      provinceName: provinces.name,
      recordingUrl: fixtures.recordingUrl,
    })
    .from(results)
    .innerJoin(fixtures, eq(results.fixtureId, fixtures.id))
    .leftJoin(competitions, eq(fixtures.competitionId, competitions.id))
    .leftJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(homeTeam, eq(fixtures.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(fixtures.awayTeamId, awayTeam.id))
    .innerJoin(homeSchool, eq(homeTeam.schoolId, homeSchool.id))
    .innerJoin(awaySchool, eq(awayTeam.schoolId, awaySchool.id))
    .leftJoin(provinces, eq(competitions.provinceId, provinces.id))
    .where(whereClause)
    .orderBy(desc(fixtures.matchDate), desc(results.publishedAt))
    .limit(pageSize)
    .offset(offset);

  const total = await countVerifiedResults(filters);
  return { rows, total, page, pageSize };
}

function buildFilterConditions(filters: ResultListFilters) {
  const parts = [];

  if (filters.provinceId) {
    parts.push(eq(competitions.provinceId, filters.provinceId));
  }

  if (filters.seasonId) {
    parts.push(eq(fixtures.seasonId, filters.seasonId));
  }

  if (filters.competitionId) {
    parts.push(eq(fixtures.competitionId, filters.competitionId));
  }

  if (filters.schoolId) {
    parts.push(
      or(
        eq(homeTeam.schoolId, filters.schoolId),
        eq(awayTeam.schoolId, filters.schoolId)
      )!
    );
  }

  if (filters.dateFrom) {
    parts.push(gte(fixtures.matchDate, filters.dateFrom));
  }
  if (filters.dateTo) {
    parts.push(lte(fixtures.matchDate, filters.dateTo));
  }

  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    parts.push(
      or(
        ilike(homeSchool.displayName, q),
        ilike(awaySchool.displayName, q),
        ilike(competitions.name, q),
        ilike(seasons.name, q)
      )!
    );
  }

  return parts.length ? and(...parts)! : undefined;
}

export async function getMatchDetails(fixtureId: string) {
  const [row] = await db
    .select({
      resultId: results.id,
      fixtureId: fixtures.id,
      homeScore: results.homeScore,
      awayScore: results.awayScore,
      verificationLevel: results.verificationLevel,
      isVerified: results.isVerified,
      publishedAt: results.publishedAt,
      matchDate: fixtures.matchDate,
      venue: fixtures.venue,
      status: fixtures.status,
      homeSchoolName: homeSchool.displayName,
      awaySchoolName: awaySchool.displayName,
      homeSchoolSlug: homeSchool.slug,
      awaySchoolSlug: awaySchool.slug,
      homeSchoolLogoPath: homeSchool.logoPath,
      awaySchoolLogoPath: awaySchool.logoPath,
      homeTeamLabel: homeTeam.teamLabel,
      awayTeamLabel: awayTeam.teamLabel,
      competitionName: competitions.name,
      seasonName: seasons.name,
      seasonYear: seasons.year,
      provinceName: provinces.name,
      recordingUrl: fixtures.recordingUrl,
    })
    .from(fixtures)
    .leftJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .leftJoin(competitions, eq(fixtures.competitionId, competitions.id))
    .innerJoin(homeTeam, eq(fixtures.homeTeamId, homeTeam.id))
    .innerJoin(awayTeam, eq(fixtures.awayTeamId, awayTeam.id))
    .innerJoin(homeSchool, eq(homeTeam.schoolId, homeSchool.id))
    .innerJoin(awaySchool, eq(awayTeam.schoolId, awaySchool.id))
    .leftJoin(provinces, eq(competitions.provinceId, provinces.id))
    .leftJoin(results, eq(results.fixtureId, fixtures.id))
    .where(eq(fixtures.id, fixtureId))
    .limit(1);

  return row ?? null;
}
