export const SCHOOL_ADMIN_CLAIMS_BUCKET = "school-admin-claims";

export function getSchoolAdminClaimLetterPublicUrl(path: string | null | undefined): string | null {
  const clean = path?.trim();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!clean || !base) return null;
  return `${base}/storage/v1/object/public/${SCHOOL_ADMIN_CLAIMS_BUCKET}/${clean}`;
}
