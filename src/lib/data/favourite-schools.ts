import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileFavouriteSchools, schools } from "@/db/schema";

export async function listFavouriteSchoolIdsForProfile(profileId: string): Promise<string[]> {
  const rows = await db
    .select({ schoolId: profileFavouriteSchools.schoolId })
    .from(profileFavouriteSchools)
    .where(eq(profileFavouriteSchools.profileId, profileId));
  return rows.map((r) => r.schoolId);
}

export async function listFavouriteSchoolsForProfile(profileId: string) {
  return db
    .select({
      schoolId: schools.id,
      displayName: schools.displayName,
      slug: schools.slug,
      logoPath: schools.logoPath,
    })
    .from(profileFavouriteSchools)
    .innerJoin(schools, eq(profileFavouriteSchools.schoolId, schools.id))
    .where(eq(profileFavouriteSchools.profileId, profileId))
    .orderBy(desc(profileFavouriteSchools.createdAt));
}

export async function isSchoolFavourited(profileId: string, schoolId: string): Promise<boolean> {
  const rows = await db
    .select({ schoolId: profileFavouriteSchools.schoolId })
    .from(profileFavouriteSchools)
    .where(
      and(eq(profileFavouriteSchools.profileId, profileId), eq(profileFavouriteSchools.schoolId, schoolId))
    )
    .limit(1);
  return rows.length > 0;
}

export async function addFavouriteSchool(profileId: string, schoolId: string): Promise<void> {
  await db
    .insert(profileFavouriteSchools)
    .values({ profileId, schoolId })
    .onConflictDoNothing();
}

export async function removeFavouriteSchool(profileId: string, schoolId: string): Promise<void> {
  await db
    .delete(profileFavouriteSchools)
    .where(
      and(eq(profileFavouriteSchools.profileId, profileId), eq(profileFavouriteSchools.schoolId, schoolId))
    );
}

export async function getFavouriteSchoolDisplayNames(profileId: string): Promise<string[]> {
  const rows = await db
    .select({ displayName: schools.displayName })
    .from(profileFavouriteSchools)
    .innerJoin(schools, eq(profileFavouriteSchools.schoolId, schools.id))
    .where(eq(profileFavouriteSchools.profileId, profileId));
  return rows.map((r) => r.displayName);
}
