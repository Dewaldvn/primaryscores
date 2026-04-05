/** Bucket for public school crests (path stored on `schools.logo_path`). */
export const SCHOOL_LOGOS_BUCKET = "school-logos";

/** Build public CDN URL for a stored object path. Safe for server and client (uses public env). */
export function getSchoolLogoPublicUrl(logoPath: string | null | undefined): string | null {
  if (!logoPath?.trim()) return null;
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!base) return null;
  const pathPart = logoPath
    .split("/")
    .filter(Boolean)
    .map((seg) => encodeURIComponent(seg))
    .join("/");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${SCHOOL_LOGOS_BUCKET}/${pathPart}`;
}
