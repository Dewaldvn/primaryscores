import type { SchoolSport } from "@/lib/sports";
import { schoolSportLabel } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";
import { teamGenderLabel } from "@/lib/team-gender";

/** One-line summary for lists (e.g. Rugby · U13 · Team A, or Hockey · U16 · Boys · B). */
export function formatTeamListingSubtitle(parts: {
  sport: SchoolSport;
  ageGroup: string;
  teamLabel: string;
  gender: TeamGender | null;
}): string {
  const g = parts.gender ? ` · ${teamGenderLabel(parts.gender)}` : "";
  return `${schoolSportLabel(parts.sport)} · ${parts.ageGroup}${g} · ${parts.teamLabel}`;
}
