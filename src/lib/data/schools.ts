import { cache } from "react";
import { and, asc, desc, eq, ilike, inArray, or, sql, count } from "drizzle-orm";
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
import { schoolsHasNicknameColumn } from "@/lib/school-db-support";
import type { SchoolSport } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";

const homeTeam = alias(teams, "home_team_m");
const awayTeam = alias(teams, "away_team_m");
const homeSchool = alias(schools, "home_school_m");
const awaySchool = alias(schools, "away_school_m");

/** Schools must have at least one active team in this sport (and optional gender for hockey-style splits). */
function schoolHasActiveTeamInSport(sport: SchoolSport, gender?: TeamGender) {
  if (gender != null) {
    return sql`exists (
      select 1 from ${teams}
      where ${teams.schoolId} = ${schools.id}
        and ${teams.active} = true
        and ${teams.sport} = ${sport}
        and ${teams.gender} = ${gender}
    )`;
  }
  return sql`exists (
    select 1 from ${teams}
    where ${teams.schoolId} = ${schools.id}
      and ${teams.active} = true
      and ${teams.sport} = ${sport}
  )`;
}

function representativeTeamIdSql(opts?: { sport?: SchoolSport; gender?: TeamGender }) {
  return opts?.sport != null && opts?.gender != null
    ? sql<string | null>`(
        select ${teams.id}
        from ${teams}
        where ${teams.schoolId} = ${schools.id}
          and ${teams.active} = true
          and ${teams.sport} = ${opts.sport}
          and ${teams.gender} = ${opts.gender}
        order by ${teams.ageGroup}, ${teams.teamLabel}
        limit 1
      )`.as("rep_team_id")
    : opts?.sport != null
      ? sql<string | null>`(
          select ${teams.id}
          from ${teams}
          where ${teams.schoolId} = ${schools.id}
            and ${teams.active} = true
            and ${teams.sport} = ${opts.sport}
          order by ${teams.ageGroup}, ${teams.teamLabel}
          limit 1
        )`.as("rep_team_id")
      : sql<string | null>`(
          select ${teams.id}
          from ${teams}
          where ${teams.schoolId} = ${schools.id}
            and ${teams.active} = true
            and ${teams.ageGroup} = 'U13'
            and ${teams.sport} = 'RUGBY'
          order by ${teams.teamLabel}
          limit 1
        )`.as("rep_team_id");
}

export const listProvinces = cache(async function listProvinces() {
  return db.select().from(provinces).orderBy(provinces.name);
});

export const listSchoolsByProvince = cache(async function listSchoolsByProvince(
  provinceId: string,
  limit = 250,
  opts?: { sport?: SchoolSport; gender?: TeamGender }
) {
  const cap = Math.min(Math.max(1, limit), 500);
  const u13TeamId = representativeTeamIdSql(opts);
  const sportFilter =
    opts?.sport != null ? schoolHasActiveTeamInSport(opts.sport, opts.gender) : undefined;

  return db
    .select({
      id: schools.id,
      displayName: schools.displayName,
      slug: schools.slug,
      town: schools.town,
      provinceName: provinces.name,
      logoPath: schools.logoPath,
      u13TeamId,
    })
    .from(schools)
    .innerJoin(provinces, eq(schools.provinceId, provinces.id))
    .where(
      and(
        eq(schools.active, true),
        eq(schools.provinceId, provinceId),
        ...(sportFilter ? [sportFilter] : [])
      )
    )
    .orderBy(schools.displayName)
    .limit(cap);
});

export async function searchSchools(
  q: string,
  limit = 30,
  opts?: { sport?: SchoolSport; gender?: TeamGender }
) {
  const term = `%${q.trim()}%`;
  if (q.trim().length < 2) return [];

  const u13TeamId = representativeTeamIdSql(opts);

  const sportFilter =
    opts?.sport != null ? schoolHasActiveTeamInSport(opts.sport, opts.gender) : undefined;

  const includeNickname = await schoolsHasNicknameColumn();
  const schoolNameMatch = includeNickname
    ? or(
        ilike(schools.displayName, term),
        ilike(schools.officialName, term),
        ilike(schools.nickname, term)
      )
    : or(ilike(schools.displayName, term), ilike(schools.officialName, term));

  return db
    .select({
      id: schools.id,
      displayName: schools.displayName,
      slug: schools.slug,
      town: schools.town,
      provinceName: provinces.name,
      logoPath: schools.logoPath,
      u13TeamId,
    })
    .from(schools)
    .innerJoin(provinces, eq(schools.provinceId, provinces.id))
    .where(
      and(
        eq(schools.active, true),
        schoolNameMatch!,
        ...(sportFilter ? [sportFilter] : [])
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
        eq(teams.ageGroup, "U13"),
        eq(teams.sport, "RUGBY")
      )
    );
}

/** All active teams for a school (any sport / age), ordered for display. */
export async function listActiveTeamsForSchool(schoolId: string) {
  return db
    .select()
    .from(teams)
    .where(and(eq(teams.schoolId, schoolId), eq(teams.active, true)))
    .orderBy(asc(teams.sport), asc(teams.ageGroup), asc(teams.gender), asc(teams.teamLabel));
}

/** Active teams for any of the given schools (e.g. school admin overview). */
export async function listActiveTeamsForSchoolIds(schoolIds: string[]) {
  if (schoolIds.length === 0) return [];
  return db
    .select()
    .from(teams)
    .where(and(eq(teams.active, true), inArray(teams.schoolId, schoolIds)))
    .orderBy(asc(teams.schoolId), asc(teams.sport), asc(teams.ageGroup), asc(teams.gender), asc(teams.teamLabel));
}

export async function getVerifiedResultsForSchool(schoolId: string, limit = 50) {
  return db
    .select({
      resultId: results.id,
      fixtureId: fixtures.id,
      homeScore: results.homeScore,
      awayScore: results.awayScore,
      verificationLevel: results.verificationLevel,
      isDummy: results.isDummy,
      matchDate: fixtures.matchDate,
      homeSchoolName: homeSchool.displayName,
      awaySchoolName: awaySchool.displayName,
      homeSchoolSlug: homeSchool.slug,
      awaySchoolSlug: awaySchool.slug,
      homeSchoolLogoPath: homeSchool.logoPath,
      awaySchoolLogoPath: awaySchool.logoPath,
      recordingUrl: fixtures.recordingUrl,
      isHome: sql<boolean>`${homeSchool.id} = ${schoolId}`,
      sport: homeTeam.sport,
      teamGender: homeTeam.gender,
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
