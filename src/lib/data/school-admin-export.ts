import { alias } from "drizzle-orm/pg-core";
import { and, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
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
import type { SchoolSport } from "@/lib/sports";

const expHomeTeam = alias(teams, "exp_home_team");
const expAwayTeam = alias(teams, "exp_away_team");
const expHomeSchool = alias(schools, "exp_home_school");
const expAwaySchool = alias(schools, "exp_away_school");

export type SchoolAdminExportRow = {
  matchDate: string;
  homeSchoolName: string;
  awaySchoolName: string;
  homeScore: number;
  awayScore: number;
  sport: string;
  competitionName: string | null;
  seasonName: string | null;
  provinceName: string | null;
  venue: string | null;
  isVerified: boolean;
  verificationLevel: string;
  publishedAt: Date | null;
};

function searchCondition(search: string | null | undefined) {
  const term = search?.trim();
  if (!term || term.length < 2) return undefined;
  const q = `%${term}%`;
  return or(
    ilike(expHomeSchool.displayName, q),
    ilike(expAwaySchool.displayName, q),
    ilike(competitions.name, q),
    ilike(seasons.name, q)
  )!;
}

export async function listResultsForSchoolAdminExport(opts: {
  scopeSchoolIds: string[];
  schoolId?: string | null;
  teamId?: string | null;
  sport?: SchoolSport | null;
  search?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  verifiedOnly: boolean;
  limit?: number;
}): Promise<SchoolAdminExportRow[]> {
  const cap = Math.min(Math.max(1, opts.limit ?? 5000), 10_000);
  const narrowSchoolIds =
    opts.schoolId && opts.scopeSchoolIds.includes(opts.schoolId)
      ? [opts.schoolId]
      : opts.scopeSchoolIds;

  const schoolScope = or(
    inArray(expHomeSchool.id, narrowSchoolIds),
    inArray(expAwaySchool.id, narrowSchoolIds),
  )!;

  const conds = [schoolScope];

  const teamCond =
    opts.teamId != null && opts.teamId.length > 0
      ? or(eq(fixtures.homeTeamId, opts.teamId), eq(fixtures.awayTeamId, opts.teamId))
      : undefined;
  if (teamCond) conds.push(teamCond);

  if (opts.sport) {
    conds.push(or(eq(expHomeTeam.sport, opts.sport), eq(expAwayTeam.sport, opts.sport))!);
  }

  const s = searchCondition(opts.search ?? undefined);
  if (s) conds.push(s);

  if (opts.dateFrom) conds.push(gte(fixtures.matchDate, opts.dateFrom));
  if (opts.dateTo) conds.push(lte(fixtures.matchDate, opts.dateTo));

  if (opts.verifiedOnly) {
    conds.push(eq(results.isVerified, true));
    conds.push(sql`${results.publishedAt} is not null`);
  }

  const whereClause = conds.length === 1 ? conds[0]! : and(...conds)!;

  return db
    .select({
      matchDate: fixtures.matchDate,
      homeSchoolName: expHomeSchool.displayName,
      awaySchoolName: expAwaySchool.displayName,
      homeScore: results.homeScore,
      awayScore: results.awayScore,
      sport: expHomeTeam.sport,
      competitionName: competitions.name,
      seasonName: seasons.name,
      provinceName: provinces.name,
      venue: fixtures.venue,
      isVerified: results.isVerified,
      verificationLevel: results.verificationLevel,
      publishedAt: results.publishedAt,
    })
    .from(results)
    .innerJoin(fixtures, eq(results.fixtureId, fixtures.id))
    .leftJoin(competitions, eq(fixtures.competitionId, competitions.id))
    .leftJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(expHomeTeam, eq(fixtures.homeTeamId, expHomeTeam.id))
    .innerJoin(expAwayTeam, eq(fixtures.awayTeamId, expAwayTeam.id))
    .innerJoin(expHomeSchool, eq(expHomeTeam.schoolId, expHomeSchool.id))
    .innerJoin(expAwaySchool, eq(expAwayTeam.schoolId, expAwaySchool.id))
    .leftJoin(provinces, eq(competitions.provinceId, provinces.id))
    .where(whereClause)
    .orderBy(desc(fixtures.matchDate), desc(results.publishedAt), desc(results.createdAt))
    .limit(cap);
}
