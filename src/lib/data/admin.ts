import { alias } from "drizzle-orm/pg-core";
import { and, asc, count, desc, eq, gte, ilike, inArray, lte, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schoolColumnsWithoutNickname, schoolsHasNicknameColumn } from "@/lib/school-db-support";
import type { SchoolSport } from "@/lib/sports";
import {
  schools,
  teams,
  seasons,
  competitions,
  provinces,
  profiles,
  results,
  fixtures,
  schoolAdminMemberships,
  profileTeamLinks,
} from "@/db/schema";

const adminHomeTeam = alias(teams, "admin_home_team");
const adminAwayTeam = alias(teams, "admin_away_team");
const adminHomeSchool = alias(schools, "admin_home_school");
const adminAwaySchool = alias(schools, "admin_away_school");

export async function adminListSchools(options?: {
  search?: string;
  limit?: number;
  latestFirst?: boolean;
}) {
  const includeNickname = await schoolsHasNicknameColumn();
  const schoolShape = {
    ...schoolColumnsWithoutNickname,
    nickname: includeNickname
      ? schools.nickname
      : sql<string | null>`cast(null as text)`.as("nickname"),
  };
  const term = options?.search?.trim();
  const whereClause =
    term && term.length >= 2
      ? includeNickname
        ? or(
            ilike(schools.displayName, `%${term}%`),
            ilike(schools.officialName, `%${term}%`),
            ilike(schools.nickname, `%${term}%`),
            ilike(schools.slug, `%${term}%`),
            ilike(schools.town, `%${term}%`),
          )
        : or(
            ilike(schools.displayName, `%${term}%`),
            ilike(schools.officialName, `%${term}%`),
            ilike(schools.slug, `%${term}%`),
            ilike(schools.town, `%${term}%`),
          )
      : undefined;
  const base = db
    .select({
      school: schoolShape,
      provinceName: provinces.name,
    })
    .from(schools)
    .innerJoin(provinces, eq(schools.provinceId, provinces.id));
  const ordered = (whereClause ? base.where(whereClause) : base).orderBy(
    ...(options?.latestFirst ? [desc(schools.createdAt), desc(schools.id)] : [asc(schools.displayName)]),
  );
  if (typeof options?.limit === "number") {
    return await ordered.limit(Math.max(1, options.limit));
  }
  return await ordered;
}

export async function adminListSchoolsForExport(filters: {
  schoolIds?: string[];
  provinceIds?: string[];
}) {
  const includeNickname = await schoolsHasNicknameColumn();
  const schoolShape = {
    ...schoolColumnsWithoutNickname,
    nickname: includeNickname
      ? schools.nickname
      : sql<string | null>`cast(null as text)`.as("nickname"),
  };
  const parts = [
    filters.schoolIds?.length ? inArray(schools.id, filters.schoolIds) : undefined,
    filters.provinceIds?.length ? inArray(schools.provinceId, filters.provinceIds) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c != null);
  const whereClause = parts.length === 0 ? undefined : parts.length === 1 ? parts[0] : and(...parts)!;
  const base = db
    .select({
      school: schoolShape,
      provinceName: provinces.name,
      provinceId: provinces.id,
    })
    .from(schools)
    .innerJoin(provinces, eq(schools.provinceId, provinces.id));
  return (whereClause ? base.where(whereClause) : base).orderBy(asc(schools.displayName));
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

export async function adminSearchSchoolsForMerge(q: string, limit = 20) {
  const term = q.trim();
  if (term.length < 2) return [];
  const like = `%${term}%`;
  const includeNickname = await schoolsHasNicknameColumn();
  const whereClause = includeNickname
    ? or(
        ilike(schools.displayName, like),
        ilike(schools.officialName, like),
        ilike(schools.nickname, like),
      )
    : or(
        ilike(schools.displayName, like),
        ilike(schools.officialName, like),
      );
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
    .where(whereClause!)
    .orderBy(asc(schools.displayName))
    .limit(Math.max(2, Math.min(50, limit)));
}

export async function adminListTeams(options?: { schoolName?: string; limit?: number }) {
  const schoolName = options?.schoolName?.trim();
  const includeNickname = schoolName ? await schoolsHasNicknameColumn() : false;
  const whereClause = schoolName
    ? or(
        ilike(schools.displayName, `%${schoolName}%`),
        ilike(teams.teamNickname, `%${schoolName}%`),
        ...(includeNickname ? [ilike(schools.nickname, `%${schoolName}%`)] : []),
      )!
    : undefined;
  const limit = options?.limit;
  const base = db
    .select({
      team: teams,
      schoolName: schools.displayName,
      schoolId: schools.id,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id));
  const ordered = (whereClause ? base.where(whereClause) : base).orderBy(desc(teams.createdAt), desc(teams.id));
  if (typeof limit === "number") {
    return await ordered.limit(Math.max(1, limit));
  }
  return await ordered;
}

export async function adminListTeamsForExport(filters: {
  teamIds?: string[];
  schoolIds?: string[];
  provinceIds?: string[];
}) {
  const parts = [
    filters.teamIds?.length ? inArray(teams.id, filters.teamIds) : undefined,
    filters.schoolIds?.length ? inArray(teams.schoolId, filters.schoolIds) : undefined,
    filters.provinceIds?.length ? inArray(schools.provinceId, filters.provinceIds) : undefined,
  ].filter((c): c is NonNullable<typeof c> => c != null);
  const whereClause = parts.length === 0 ? undefined : parts.length === 1 ? parts[0] : and(...parts)!;
  const base = db
    .select({
      team: teams,
      schoolName: schools.displayName,
      schoolId: schools.id,
      provinceId: schools.provinceId,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id));
  return (whereClause ? base.where(whereClause) : base).orderBy(asc(schools.displayName), asc(teams.ageGroup));
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
  return db
    .select({
      season: seasons,
      provinceName: provinces.name,
    })
    .from(seasons)
    .leftJoin(provinces, eq(seasons.provinceId, provinces.id))
    .orderBy(desc(seasons.year), asc(seasons.name));
}

export async function adminListCompetitions() {
  return db
    .select({
      competition: competitions,
      provinceName: provinces.name,
    })
    .from(competitions)
    .leftJoin(provinces, eq(competitions.provinceId, provinces.id))
    .orderBy(desc(competitions.year), asc(competitions.name));
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

function adminResultsTeamCondition(teamId: string | undefined) {
  if (!teamId) return undefined;
  return or(eq(fixtures.homeTeamId, teamId), eq(fixtures.awayTeamId, teamId))!;
}

export type AdminResultListFilters = {
  search?: string;
  scopeSchoolIds?: string[];
  teamId?: string;
  /** Home or away team has this sport. */
  sport?: SchoolSport;
  /** Inclusive, YYYY-MM-DD. */
  dateFrom?: string;
  dateTo?: string;
};

function adminResultsWhere(filters: AdminResultListFilters) {
  const cond = adminResultsSearchCondition(filters.search);
  const schoolCond = adminResultsSchoolScopeCondition(filters.scopeSchoolIds);
  const teamCond = adminResultsTeamCondition(filters.teamId);
  const parts = [cond, schoolCond, teamCond];
  if (filters.sport) {
    parts.push(or(eq(adminHomeTeam.sport, filters.sport), eq(adminAwayTeam.sport, filters.sport))!);
  }
  const df = filters.dateFrom?.trim();
  const dt = filters.dateTo?.trim();
  if (df) parts.push(gte(fixtures.matchDate, df));
  if (dt) parts.push(lte(fixtures.matchDate, dt));
  const filtered = parts.filter((c): c is NonNullable<typeof c> => c != null);
  if (filtered.length === 0) return undefined;
  return filtered.length === 1 ? filtered[0] : and(...filtered)!;
}

export async function adminCountAllResults(
  search?: string,
  scopeSchoolIds?: string[],
  teamId?: string,
): Promise<number> {
  const whereClause = adminResultsWhere({ search, scopeSchoolIds, teamId });
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
  /** Limit to fixtures where the home or away team is this id. */
  teamId?: string;
}): Promise<{ rows: AdminResultRow[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page);
  const pageSize = Math.min(100, Math.max(10, options.pageSize));
  const offset = (page - 1) * pageSize;
  const whereClause = adminResultsWhere({
    search: options.search,
    scopeSchoolIds: options.scopeSchoolIds,
    teamId: options.teamId,
  });

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

  const total = await adminCountAllResults(options.search, options.scopeSchoolIds, options.teamId);
  return { rows, total, page, pageSize };
}

const ADMIN_EXPORT_RESULTS_MAX = 20_000;

/** Bulk export of results with optional sport and match-date range. */
export async function adminListResultsForExport(
  filters: AdminResultListFilters,
  limit = ADMIN_EXPORT_RESULTS_MAX,
): Promise<AdminResultRow[]> {
  const cap = Math.min(Math.max(1, limit), ADMIN_EXPORT_RESULTS_MAX);
  const whereClause = adminResultsWhere(filters);
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

  return await (whereClause ? listBase.where(whereClause) : listBase)
    .orderBy(desc(fixtures.matchDate), desc(results.publishedAt), desc(results.createdAt))
    .limit(cap);
}

export type SchoolAdminMembershipRow = {
  membershipId: string;
  schoolId: string;
  schoolName: string;
  status: "PENDING" | "ACTIVE" | "REVOKED";
};

export type SchoolAdminTeamLinkRow = {
  teamId: string;
  schoolName: string;
  sport: string;
  ageGroup: string;
  teamLabel: string;
  gender: string | null;
};

export type SchoolAdminOverviewRow = {
  profile: { id: string; email: string; displayName: string };
  memberships: SchoolAdminMembershipRow[];
  teamLinks: SchoolAdminTeamLinkRow[];
};

/** Every SCHOOL_ADMIN profile with school memberships and linked teams. */
export async function adminListSchoolAdminOverview(): Promise<SchoolAdminOverviewRow[]> {
  const schoolAdmins = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
    })
    .from(profiles)
    .where(eq(profiles.role, "SCHOOL_ADMIN"))
    .orderBy(asc(profiles.email));

  if (schoolAdmins.length === 0) return [];

  const ids = schoolAdmins.map((p) => p.id);

  const memRows = await db
    .select({
      profileId: schoolAdminMemberships.profileId,
      membershipId: schoolAdminMemberships.id,
      schoolId: schools.id,
      schoolName: schools.displayName,
      status: schoolAdminMemberships.status,
    })
    .from(schoolAdminMemberships)
    .innerJoin(schools, eq(schoolAdminMemberships.schoolId, schools.id))
    .where(inArray(schoolAdminMemberships.profileId, ids));

  const teamRows = await db
    .select({
      profileId: profileTeamLinks.profileId,
      teamId: teams.id,
      schoolName: schools.displayName,
      sport: teams.sport,
      ageGroup: teams.ageGroup,
      teamLabel: teams.teamLabel,
      gender: teams.gender,
    })
    .from(profileTeamLinks)
    .innerJoin(teams, eq(profileTeamLinks.teamId, teams.id))
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .where(inArray(profileTeamLinks.profileId, ids));

  const memBy = new Map<string, SchoolAdminMembershipRow[]>();
  for (const m of memRows) {
    const list = memBy.get(m.profileId) ?? [];
    list.push({
      membershipId: m.membershipId,
      schoolId: m.schoolId,
      schoolName: m.schoolName,
      status: m.status,
    });
    memBy.set(m.profileId, list);
  }

  const teamBy = new Map<string, SchoolAdminTeamLinkRow[]>();
  for (const t of teamRows) {
    const list = teamBy.get(t.profileId) ?? [];
    list.push({
      teamId: t.teamId,
      schoolName: t.schoolName,
      sport: t.sport,
      ageGroup: t.ageGroup,
      teamLabel: t.teamLabel,
      gender: t.gender,
    });
    teamBy.set(t.profileId, list);
  }

  return schoolAdmins.map((p) => ({
    profile: { id: p.id, email: p.email, displayName: p.displayName },
    memberships: memBy.get(p.id) ?? [],
    teamLinks: teamBy.get(p.id) ?? [],
  }));
}
