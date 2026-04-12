/** Matches Postgres enum `team_gender` and Drizzle `teamGenderEnum`. */
export const TEAM_GENDERS = ["MALE", "FEMALE"] as const;
export type TeamGender = (typeof TEAM_GENDERS)[number];

const LABELS: Record<TeamGender, string> = {
  MALE: "Boys / men",
  FEMALE: "Girls / women",
};

export function teamGenderLabel(g: TeamGender): string {
  return LABELS[g];
}

export function parseTeamGenderQueryParam(v: string | null | undefined): TeamGender | undefined {
  if (!v) return undefined;
  const u = v.trim().toUpperCase();
  return (TEAM_GENDERS as readonly string[]).includes(u) ? (u as TeamGender) : undefined;
}
