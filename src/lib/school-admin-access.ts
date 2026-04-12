import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { fixtures, results, schoolAdminMemberships, teams } from "@/db/schema";

export async function getActiveManagedSchoolIds(profileId: string): Promise<string[]> {
  const rows = await db
    .select({ schoolId: schoolAdminMemberships.schoolId })
    .from(schoolAdminMemberships)
    .where(
      and(
        eq(schoolAdminMemberships.profileId, profileId),
        eq(schoolAdminMemberships.status, "ACTIVE"),
      ),
    );
  return rows.map((r) => r.schoolId);
}

export async function profileManagesSchool(profileId: string, schoolId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: schoolAdminMemberships.id })
    .from(schoolAdminMemberships)
    .where(
      and(
        eq(schoolAdminMemberships.profileId, profileId),
        eq(schoolAdminMemberships.schoolId, schoolId),
        eq(schoolAdminMemberships.status, "ACTIVE"),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Home and away school ids for the fixture linked to this result row. */
export async function getSchoolIdsForResult(resultId: string): Promise<{
  homeSchoolId: string;
  awaySchoolId: string;
} | null> {
  const [row] = await db
    .select({
      homeSchoolId: teams.schoolId,
    })
    .from(results)
    .innerJoin(fixtures, eq(results.fixtureId, fixtures.id))
    .innerJoin(teams, eq(fixtures.homeTeamId, teams.id))
    .where(eq(results.id, resultId))
    .limit(1);

  const [away] = await db
    .select({
      awaySchoolId: teams.schoolId,
    })
    .from(results)
    .innerJoin(fixtures, eq(results.fixtureId, fixtures.id))
    .innerJoin(teams, eq(fixtures.awayTeamId, teams.id))
    .where(eq(results.id, resultId))
    .limit(1);

  if (!row || !away) return null;
  return { homeSchoolId: row.homeSchoolId, awaySchoolId: away.awaySchoolId };
}

export async function schoolAdminCanEditResult(
  profileId: string,
  resultId: string,
  managedSchoolIds: string[],
): Promise<boolean> {
  if (managedSchoolIds.length === 0) return false;
  const schools = await getSchoolIdsForResult(resultId);
  if (!schools) return false;
  const set = new Set(managedSchoolIds);
  return set.has(schools.homeSchoolId) || set.has(schools.awaySchoolId);
}

export async function getTeamSchoolId(teamId: string): Promise<string | null> {
  const [row] = await db.select({ schoolId: teams.schoolId }).from(teams).where(eq(teams.id, teamId)).limit(1);
  return row?.schoolId ?? null;
}

export async function schoolAdminManagesTeam(
  profileId: string,
  teamId: string,
  managedSchoolIds: string[],
): Promise<boolean> {
  const sid = await getTeamSchoolId(teamId);
  if (!sid) return false;
  return managedSchoolIds.includes(sid);
}

/** For updates: team must belong to a managed school; new schoolId must stay in the set. */
export async function schoolAdminCanUpsertTeam(
  managedSchoolIds: string[],
  input: { id?: string; schoolId: string },
): Promise<boolean> {
  if (managedSchoolIds.length === 0) return false;
  if (!managedSchoolIds.includes(input.schoolId)) return false;
  if (!input.id) return true;
  const existingSchoolId = await getTeamSchoolId(input.id);
  if (!existingSchoolId) return false;
  return managedSchoolIds.includes(existingSchoolId);
}
