import type { Metadata } from "next";
import { MySchoolsContent } from "@/components/favourites-bar";
import { AccountTeamFavouritesList } from "@/components/account-team-favourites-list";
import { LinkButton } from "@/components/link-button";
import { getProfile, requireUser } from "@/lib/auth";
import { listFavouriteTeamsForProfile } from "@/lib/data/favourite-teams";
import { isDatabaseConfigured } from "@/lib/db-safe";

export const metadata: Metadata = {
  title: "My favourites",
  description:
    "Schools and teams you follow, recent verified results, and matching live games.",
};

export default async function MyFavouritesPage() {
  await requireUser("/login?redirect=%2Fmy-favourites");
  const profile = await getProfile();
  if (!profile) {
    return null;
  }

  const teams =
    isDatabaseConfigured() ? await listFavouriteTeamsForProfile(profile.id, 80) : [];

  return (
    <div className="mx-auto max-w-4xl space-y-10">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-bold">My favourites</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Favourite schools and specific sides, recent verified results involving those schools, and open live games
            that match by name.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/find-school" variant="outline" size="sm">
            Find a school
          </LinkButton>
          <LinkButton href="/add-team" variant="outline" size="sm">
            Add school or team
          </LinkButton>
        </div>
      </div>

      <MySchoolsContent />

      <section id="teams" className="scroll-mt-24">
        <AccountTeamFavouritesList teams={teams} />
      </section>
    </div>
  );
}
