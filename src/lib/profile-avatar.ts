/** Bucket for public contributor avatars (path stored on `profiles.avatar_path`). */
export const USER_AVATARS_BUCKET = "user-avatars";

export function getProfileAvatarPublicUrl(avatarPath: string | null | undefined): string | null {
  if (!avatarPath?.trim()) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return null;
  const pathPart = avatarPath
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${USER_AVATARS_BUCKET}/${pathPart}`;
}
