import { getProfile } from "@/lib/auth";
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
            }
          : null
      }
    />
  );
}
