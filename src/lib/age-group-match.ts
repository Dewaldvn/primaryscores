/** Compare age groups by shared U-number band (e.g. U16 and U16A are compatible). */
export function ageGroupBand(value: string | null | undefined): string {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const m = raw.match(/u\s*(\d{1,2})/i);
  if (m) return `U${Number(m[1])}`;
  return raw.replace(/\s+/g, "").toUpperCase();
}

export function sameAgeGroupBand(a: string | null | undefined, b: string | null | undefined): boolean {
  const aa = ageGroupBand(a);
  const bb = ageGroupBand(b);
  if (!aa || !bb) return false;
  return aa === bb;
}
