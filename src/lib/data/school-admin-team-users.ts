import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profileTeamLinks, profiles } from "@/db/schema";

export type TeamLinkedProfileRow = {
  profileId: string;
  email: string;
  displayName: string;
};

export async function listProfilesLinkedToTeam(teamId: string): Promise<TeamLinkedProfileRow[]> {
  return db
    .select({
      profileId: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
    })
    .from(profileTeamLinks)
    .innerJoin(profiles, eq(profileTeamLinks.profileId, profiles.id))
    .where(eq(profileTeamLinks.teamId, teamId))
    .orderBy(asc(profiles.email));
}
