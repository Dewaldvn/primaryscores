import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  schools,
  teams,
  seasons,
  competitions,
  provinces,
  profiles,
} from "@/db/schema";

export async function adminListSchools() {
  return db
    .select({
      school: schools,
      provinceName: provinces.name,
    })
    .from(schools)
    .innerJoin(provinces, eq(schools.provinceId, provinces.id))
    .orderBy(asc(schools.displayName));
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

export async function listAllTeamsForModeration() {
  return db
    .select({
      teamId: teams.id,
      schoolName: schools.displayName,
      ageGroup: teams.ageGroup,
      teamLabel: teams.teamLabel,
    })
    .from(teams)
    .innerJoin(schools, eq(teams.schoolId, schools.id))
    .where(eq(teams.active, true))
    .orderBy(asc(schools.displayName));
}
