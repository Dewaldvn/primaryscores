import { redirect } from "next/navigation";
import { ProfileAccountClient } from "@/components/profile-account-client";
import { AccountFavouritesList } from "@/components/account-favourites-list";
import { getProfile, requireUser } from "@/lib/auth";
import { getProfileAvatarPublicUrl } from "@/lib/profile-avatar";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { listFavouriteSchoolsForProfile } from "@/lib/data/favourite-schools";
import { listFavouriteTeamsForProfile } from "@/lib/data/favourite-teams";
import { AccountTeamFavouritesList } from "@/components/account-team-favourites-list";

export default async function AccountPage() {
  if (!isDatabaseConfigured()) redirect("/");

  await requireUser("/login?redirect=%2Faccount");
  const profile = await getProfile();
  if (!profile) redirect("/login?redirect=%2Faccount");

  const avatarUrl = getProfileAvatarPublicUrl(profile.avatarPath);
  const hasAvatar = Boolean(profile.avatarPath?.trim());
  const [favouriteSchools, favouriteTeams] = await Promise.all([
    listFavouriteSchoolsForProfile(profile.id),
    listFavouriteTeamsForProfile(profile.id, 80),
  ]);

  return (
    <main className="container max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">Manage how you appear on the site.</p>
      </div>
      <AccountFavouritesList
        schools={favouriteSchools.map((f) => ({
          id: f.schoolId,
          displayName: f.displayName,
          slug: f.slug,
        }))}
      />
      <AccountTeamFavouritesList teams={favouriteTeams} />
      <ProfileAccountClient
        key={profile.avatarPath ?? "none"}
        email={profile.email}
        displayName={profile.displayName}
        avatarUrl={avatarUrl}
        hasAvatar={hasAvatar}
      />
    </main>
  );
}
