import { redirect } from "next/navigation";
import { ProfileAccountClient } from "@/components/profile-account-client";
import { getProfile, requireUser } from "@/lib/auth";
import { getProfileAvatarPublicUrl } from "@/lib/profile-avatar";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function AccountPage() {
  if (!isDatabaseConfigured()) redirect("/");

  await requireUser("/login?redirect=%2Faccount");
  const profile = await getProfile();
  if (!profile) redirect("/login?redirect=%2Faccount");

  const avatarUrl = getProfileAvatarPublicUrl(profile.avatarPath);
  const hasAvatar = Boolean(profile.avatarPath?.trim());

  return (
    <main className="container max-w-2xl space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">Account</h1>
        <p className="text-sm text-muted-foreground">Manage how you appear on the site.</p>
      </div>
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
