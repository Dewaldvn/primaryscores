import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  competitions,
  fixtures,
  provinces,
  results,
  schools,
  seasons,
  teams,
} from "@/db/schema";
import { searchSchools } from "@/lib/data/schools";

const homeTeam = alias(teams, "gs_home_team");
const awayTeam = alias(teams, "gs_away_team");
const homeSchool = alias(schools, "gs_home_school");
const awaySchool = alias(schools, "gs_away_school");

function verifiedResultsCondition() {
  return and(eq(results.isVerified, true), sql`${results.publishedAt} is not null`);
}

export type GlobalSearchProvinceGame = {
  resultId: string;
  fixtureId: string;
  homeScore: number;
  awayScore: number;
  matchDate: string;
  homeSchoolName: string;
  awaySchoolName: string;
  homeSchoolSlug: string;
  awaySchoolSlug: string;
  homeSchoolLogoPath: string | null;
  awaySchoolLogoPath: string | null;
  competitionName: string | null;
  seasonName: string | null;
  provinceName: string | null;
};

export type GlobalSearchResult = {
  schools: Awaited<ReturnType<typeof searchSchools>>;
  competitions: { id: string; name: string; provinceName: string | null }[];
  seasons: { id: string; name: string; year: number }[];
  /** Provinces whose name or code matched the query (drives province games). */
  matchedProvinces: { id: string; name: string }[];
  /** Verified games for competitions in those provinces (newest first). */
  provinceGames: GlobalSearchProvinceGame[];
};

export async function runGlobalSearch(q: string): Promise<GlobalSearchResult> {
  const term = q.trim();
  if (term.length < 2) {
    return {
      schools: [],
      competitions: [],
      seasons: [],
      matchedProvinces: [],
      provinceGames: [],
    };
  }
  const like = `%${term}%`;

  const matchedProvinces = await db
    .select({ id: provinces.id, name: provinces.name })
    .from(provinces)
    .where(
      or(ilike(provinces.name, like), ilike(provinces.code, like))!
    )
    .orderBy(provinces.name)
    .limit(6);

  const provinceIds = matchedProvinces.map((p) => p.id);

  const [schoolRows, compRows, seasonRows, provinceGames] = await Promise.all([
    searchSchools(term, 15),
    db
      .select({
        id: competitions.id,
        name: competitions.name,
        provinceName: provinces.name,
      })
      .from(competitions)
      .leftJoin(provinces, eq(competitions.provinceId, provinces.id))
      .where(and(eq(competitions.active, true), ilike(competitions.name, like)))
      .orderBy(competitions.name)
      .limit(8),
    db
      .select({
        id: seasons.id,
        name: seasons.name,
        year: seasons.year,
      })
      .from(seasons)
      .where(ilike(seasons.name, like))
      .orderBy(desc(seasons.year))
      .limit(8),
    provinceIds.length === 0
      ? Promise.resolve([] as GlobalSearchProvinceGame[])
      : db
          .select({
            resultId: results.id,
            fixtureId: fixtures.id,
            homeScore: results.homeScore,
            awayScore: results.awayScore,
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
          .where(
            and(verifiedResultsCondition(), inArray(competitions.provinceId, provinceIds))!
          )
          .orderBy(desc(results.publishedAt))
          .limit(50),
  ]);

  return {
    schools: schoolRows,
    competitions: compRows,
    seasons: seasonRows,
    matchedProvinces,
    provinceGames,
  };
}
