import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileFavouriteTeams, schools, teams } from "@/db/schema";
import type { SchoolSport } from "@/lib/sports";

export type FavouriteTeamRow = {
  teamId: string;
  schoolId: string;
  schoolName: string;
  schoolSlug: string;
  schoolLogoPath: string | null;
  ageGroup: string;
  teamLabel: string;
  sport: SchoolSport;
  gender: "MALE" | "FEMALE" | null;
};

export async function listFavouriteTeamIdsForProfile(profileId: string): Promise<Set<string>> {
  const rows = await db
    .select({ teamId: profileFavouriteTeams.teamId })
    .from(profileFavouriteTeams)
    .where(eq(profileFavouriteTeams.profileId, profileId));
  return new Set(rows.map((r) => r.teamId));
}

export async function listFavouriteTeamsForProfile(profileId: string, limit = 50): Promise<FavouriteTeamRow[]> {
  const cap = Math.min(Math.max(1, limit), 100);
  return db
    .select({
      teamId: teams.id,
      schoolId: schools.id,
      schoolName: schools.displayName,
      schoolSlug: schools.slug,
      schoolLogoPath: schools.logoPath,
      ageGroup: teams.ageGroup,
      teamLabel: teams.teamLabel,
      sport: teams.sport,
      gender: teams.gender,
    })
    .from(profileFavouriteTeams)
    .innerJoin(teams, eq(profileFavouriteTeams.teamId, teams.id))
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .where(eq(profileFavouriteTeams.profileId, profileId))
    .orderBy(desc(profileFavouriteTeams.createdAt))
    .limit(cap);
}

export async function isTeamFavourited(profileId: string, teamId: string): Promise<boolean> {
  const rows = await db
    .select({ teamId: profileFavouriteTeams.teamId })
    .from(profileFavouriteTeams)
    .where(and(eq(profileFavouriteTeams.profileId, profileId), eq(profileFavouriteTeams.teamId, teamId)))
    .limit(1);
  return rows.length > 0;
}

export async function addFavouriteTeam(profileId: string, teamId: string): Promise<void> {
  await db.insert(profileFavouriteTeams).values({ profileId, teamId }).onConflictDoNothing();
}

export async function removeFavouriteTeam(profileId: string, teamId: string): Promise<void> {
  await db
    .delete(profileFavouriteTeams)
    .where(and(eq(profileFavouriteTeams.profileId, profileId), eq(profileFavouriteTeams.teamId, teamId)));
}

/** Batch check for many team ids (e.g. school page). */
export async function filterFavouritedTeamIds(profileId: string, teamIds: string[]): Promise<Set<string>> {
  const unique = Array.from(new Set(teamIds)).filter((id) => /^[0-9a-f-]{36}$/i.test(id));
  if (unique.length === 0) return new Set();
  const rows = await db
    .select({ teamId: profileFavouriteTeams.teamId })
    .from(profileFavouriteTeams)
    .where(and(eq(profileFavouriteTeams.profileId, profileId), inArray(profileFavouriteTeams.teamId, unique)));
  return new Set(rows.map((r) => r.teamId));
}
