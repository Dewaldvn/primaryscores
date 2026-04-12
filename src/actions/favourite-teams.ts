"use server";

import { getSessionUser } from "@/lib/auth";
import { ensureContributorProfile } from "@/lib/auth/ensure-profile";
import {
  addFavouriteTeam,
  isTeamFavourited,
  removeFavouriteTeam,
} from "@/lib/data/favourite-teams";
import { db } from "@/lib/db";
import { teams } from "@/db/schema";
import { eq } from "drizzle-orm";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function toggleFavouriteTeamAction(teamId: string) {
  const user = await getSessionUser();
  if (!user) {
    return { ok: false as const, error: "Sign in to favourite a team." };
  }
  if (!UUID_RE.test(teamId)) {
    return { ok: false as const, error: "Invalid team." };
  }

  await ensureContributorProfile(user);

  const [t] = await db
    .select({ id: teams.id, active: teams.active })
    .from(teams)
    .where(eq(teams.id, teamId))
    .limit(1);
  if (!t) {
    return { ok: false as const, error: "Team not found." };
  }

  const favourited = await isTeamFavourited(user.id, teamId);
  if (favourited) {
    await removeFavouriteTeam(user.id, teamId);
    return { ok: true as const, favourited: false as const };
  }
  if (!t.active) {
    return { ok: false as const, error: "Only active teams can be added to favourites." };
  }
  await addFavouriteTeam(user.id, teamId);
  return { ok: true as const, favourited: true as const };
}
