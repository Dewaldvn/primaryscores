import { getProfile } from "@/lib/auth";
import { getProfileAvatarPublicUrl } from "@/lib/profile-avatar";
import { SiteHeader } from "@/components/site-header";

export async function SiteHeaderAsync() {
  const profile = await getProfile();
  return (
    <SiteHeader
      profile={
        profile
          ? {
              email: profile.email,
              displayName: profile.displayName,
              role: profile.role,
              avatarUrl: getProfileAvatarPublicUrl(profile.avatarPath),
            }
          : null
      }
    />
  );
}
