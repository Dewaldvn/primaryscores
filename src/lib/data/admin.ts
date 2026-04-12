import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schoolColumnsWithoutNickname, schoolsHasNicknameColumn } from "@/lib/school-db-support";
import {
  schools,
  teams,
  seasons,
  competitions,
  provinces,
  profiles,
  results,
  fixtures,
} from "@/db/schema";

const adminHomeTeam = alias(teams, "admin_home_team");
const adminAwayTeam = alias(teams, "admin_away_team");
const adminHomeSchool = alias(schools, "admin_home_school");
const adminAwaySchool = alias(schools, "admin_away_school");

export async function adminListSchools() {
  const includeNickname = await schoolsHasNicknameColumn();
  const schoolShape = {
    ...schoolColumnsWithoutNickname,
    nickname: includeNickname
      ? schools.nickname
      : sql<string | null>`cast(null as text)`.as("nickname"),
  };
  return db
    .select({
      school: schoolShape,
      provinceName: provinces.name,
    })
    .from(schools)
    .innerJoin(provinces, eq(schools.provinceId, provinces.id))
    .orderBy(asc(schools.displayName));
}

export async function adminGetSchoolById(id: string) {
  const includeNickname = await schoolsHasNicknameColumn();
  const schoolShape = {
    ...schoolColumnsWithoutNickname,
    nickname: includeNickname
      ? schools.nickname
      : sql<string | null>`cast(null as text)`.as("nickname"),
  };
  const [row] = await db
    .select({
      school: schoolShape,
      provinceName: provinces.name,
    })
    .from(schools)
    .innerJoin(provinces, eq(schools.provinceId, provinces.id))
    .where(eq(schools.id, id))
    .limit(1);
  return row ?? null;
}

export async function adminListTeams() {
  return db
    .select({
      team: teams,
      schoolName: schools.displayName,
      schoolId: schools.id,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .orderBy(asc(schools.displayName), asc(teams.ageGroup));
}

export async function adminListTeamsForSchoolIds(schoolIds: string[]) {
  if (schoolIds.length === 0) return [];
  return db
    .select({
      team: teams,
      schoolName: schools.displayName,
      schoolId: schools.id,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .where(inArray(teams.schoolId, schoolIds))
    .orderBy(asc(schools.displayName), asc(teams.ageGroup));
}

export async function adminGetTeamById(id: string) {
  const [row] = await db
    .select({
      team: teams,
      schoolName: schools.displayName,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .where(eq(teams.id, id))
    .limit(1);
  return row ?? null;
}

export async function adminListSeasons() {
  return db.select().from(seasons).orderBy(desc(seasons.year));
}

export async function adminListCompetitions() {
  return db
    .select({
      competition: competitions,
      provinceName: provinces.name,
    })
    .from(competitions)
    .leftJoin(provinces, eq(competitions.provinceId, provinces.id))
    .orderBy(asc(competitions.name));
}

export async function adminListProfiles() {
  return db.select().from(profiles).orderBy(asc(profiles.email));
}

/** All teams for moderator pick-lists (includes inactive so UUIDs from submissions still resolve). */
export async function listAllTeamsForModeration() {
  return db
    .select({
      teamId: teams.id,
      schoolName: schools.displayName,
      sport: teams.sport,
      gender: teams.gender,
      ageGroup: teams.ageGroup,
      teamLabel: teams.teamLabel,
      active: teams.active,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .orderBy(asc(schools.displayName));
}

export type AdminResultRow = {
  resultId: string;
  fixtureId: string;
  homeScore: number;
  awayScore: number;
  verificationLevel: string;
  isVerified: boolean;
  publishedAt: Date | null;
  matchDate: string;
  venue: string | null;
  recordingUrl: string | null;
  homeSchoolName: string;
  awaySchoolName: string;
  homeSchoolLogoPath: string | null;
  awaySchoolLogoPath: string | null;
  competitionName: string | null;
  seasonName: string | null;
  provinceName: string | null;
};

function adminResultsSearchCondition(search: string | undefined) {
  const term = search?.trim();
  if (!term || term.length < 2) return undefined;
  const q = `%${term}%`;
  return or(
    ilike(adminHomeSchool.displayName, q),
    ilike(adminAwaySchool.displayName, q),
    ilike(competitions.name, q),
    ilike(seasons.name, q)
  )!;
}

function adminResultsSchoolScopeCondition(schoolIds: string[] | undefined) {
  if (!schoolIds?.length) return undefined;
  return or(
    inArray(adminHomeSchool.id, schoolIds),
    inArray(adminAwaySchool.id, schoolIds),
  )!;
}

function adminResultsWhere(search: string | undefined, scopeSchoolIds: string[] | undefined) {
  const cond = adminResultsSearchCondition(search);
  const schoolCond = adminResultsSchoolScopeCondition(scopeSchoolIds);
  if (cond && schoolCond) return and(cond, schoolCond);
  return cond ?? schoolCond;
}

export async function adminCountAllResults(
  search?: string,
  scopeSchoolIds?: string[],
): Promise<number> {
  const whereClause = adminResultsWhere(search, scopeSchoolIds);
  const base = db
    .select({ n: count() })
    .from(results)
    .innerJoin(fixtures, eq(results.fixtureId, fixtures.id))
    .leftJoin(competitions, eq(fixtures.competitionId, competitions.id))
    .leftJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(adminHomeTeam, eq(fixtures.homeTeamId, adminHomeTeam.id))
    .innerJoin(adminAwayTeam, eq(fixtures.awayTeamId, adminAwayTeam.id))
    .innerJoin(adminHomeSchool, eq(adminHomeTeam.schoolId, adminHomeSchool.id))
    .innerJoin(adminAwaySchool, eq(adminAwayTeam.schoolId, adminAwaySchool.id));
  const [row] = whereClause ? await base.where(whereClause) : await base;
  return row?.n ?? 0;
}

export async function adminListAllResults(options: {
  page: number;
  pageSize: number;
  search?: string;
  /** Limit to fixtures where the home or away school is one of these ids. */
  scopeSchoolIds?: string[];
}): Promise<{ rows: AdminResultRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page);
  const pageSize = Math.min(100, Math.max(10, options.pageSize));
  const offset = (page - 1) * pageSize;
  const whereClause = adminResultsWhere(options.search, options.scopeSchoolIds);

  const listBase = db
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
      recordingUrl: fixtures.recordingUrl,
      homeSchoolName: adminHomeSchool.displayName,
      awaySchoolName: adminAwaySchool.displayName,
      homeSchoolLogoPath: adminHomeSchool.logoPath,
      awaySchoolLogoPath: adminAwaySchool.logoPath,
      competitionName: competitions.name,
      seasonName: seasons.name,
      provinceName: provinces.name,
    })
    .from(results)
    .innerJoin(fixtures, eq(results.fixtureId, fixtures.id))
    .leftJoin(competitions, eq(fixtures.competitionId, competitions.id))
    .leftJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(adminHomeTeam, eq(fixtures.homeTeamId, adminHomeTeam.id))
    .innerJoin(adminAwayTeam, eq(fixtures.awayTeamId, adminAwayTeam.id))
    .innerJoin(adminHomeSchool, eq(adminHomeTeam.schoolId, adminHomeSchool.id))
    .innerJoin(adminAwaySchool, eq(adminAwayTeam.schoolId, adminAwaySchool.id))
    .leftJoin(provinces, eq(competitions.provinceId, provinces.id));

  const rows = await (whereClause ? listBase.where(whereClause) : listBase)
    .orderBy(desc(fixtures.matchDate), desc(results.publishedAt), desc(results.createdAt))
    .limit(pageSize)
    .offset(offset);

  const total = await adminCountAllResults(options.search, options.scopeSchoolIds);
  return { rows, total, page, pageSize };
}
