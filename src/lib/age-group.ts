/** Normalise age group so it always starts with "U" (e.g. "13" → "U13", "u9" → "U9"). */
export function normalizeAgeGroupInput(v: unknown): string {
  if (typeof v !== "string") return "";
  const raw = v.trim().replace(/\s+/g, "");
  if (!raw) return "";
  const upper = raw.toUpperCase();
  if (upper.startsWith("U")) {
    const rest = upper.slice(1).replace(/[^0-9A-Z]/g, "");
    return rest.length > 0 ? `U${rest}` : "U";
  }
  const digits = raw.replace(/\D/g, "");
  if (digits.length > 0) return `U${digits}`;
  return `U${upper.replace(/[^0-9A-Z]/g, "")}`;
}
