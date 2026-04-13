import { redirect } from "next/navigation";
import Link from "next/link";
import { ProfileAccountClient } from "@/components/profile-account-client";
import { AccountFavouritesList } from "@/components/account-favourites-list";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getProfile, requireUser } from "@/lib/auth";
import { getProfileAvatarPublicUrl } from "@/lib/profile-avatar";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { listFavouriteSchoolsForProfile } from "@/lib/data/favourite-schools";
import { listFavouriteTeamsForProfile } from "@/lib/data/favourite-teams";
import { listMembershipsForProfile } from "@/lib/data/school-admin-dashboard";
import { AccountTeamFavouritesList } from "@/components/account-team-favourites-list";
import { FirstSignInDialog } from "@/components/first-sign-in-dialog";

export default async function AccountPage() {
  if (!isDatabaseConfigured()) redirect("/");

  await requireUser("/login?redirect=%2Faccount");
  const profile = await getProfile();
  if (!profile) redirect("/login?redirect=%2Faccount");

  const avatarUrl = getProfileAvatarPublicUrl(profile.avatarPath);
  const hasAvatar = Boolean(profile.avatarPath?.trim());
  const [favouriteSchools, favouriteTeams, schoolAdminMemberships] = await Promise.all([
    listFavouriteSchoolsForProfile(profile.id),
    listFavouriteTeamsForProfile(profile.id, 80),
    listMembershipsForProfile(profile.id),
  ]);
  const pendingClaims = schoolAdminMemberships.filter((m) => m.status === "PENDING");
  const activeClaims = schoolAdminMemberships.filter((m) => m.status === "ACTIVE");
  const revokedClaims = schoolAdminMemberships.filter((m) => m.status === "REVOKED");

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
      <Card>
        <CardHeader>
          <CardTitle>School admin applications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-muted-foreground">
            Pending: {pendingClaims.length} · Active: {activeClaims.length} · Revoked: {revokedClaims.length}
          </p>
          {pendingClaims.length > 0 ? (
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              {pendingClaims.map((m) => (
                <li key={m.id}>{m.schoolDisplayName}</li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No pending applications right now.</p>
          )}
          <div className="flex flex-wrap gap-3 text-sm">
            <Link href="/apply-school-admin" className="text-primary underline">
              Apply or submit another claim
            </Link>
            {activeClaims.length > 0 ? (
              <Link href="/school-admin" className="text-primary underline">
                Open school admin
              </Link>
            ) : null}
            <a
              href="mailto:schooladmin@sportscores.co.za?subject=School%20Admin%20Application%20Query"
              className="text-primary underline"
            >
              Query application status by email
            </a>
          </div>
        </CardContent>
      </Card>
      <ProfileAccountClient
        key={profile.avatarPath ?? "none"}
        email={profile.email}
        displayName={profile.displayName}
        avatarUrl={avatarUrl}
        hasAvatar={hasAvatar}
      />
      <FirstSignInDialog openInitially={profile.onboardingStatus === "PENDING"} />
    </main>
  );
}
