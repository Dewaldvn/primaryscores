import { SCHOOL_SPORTS, type SchoolSport } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";

type TeamSortShape = {
  sport: SchoolSport;
  ageGroup: string;
  gender: TeamGender | null;
  teamLabel: string;
};

function sportOrderIndex(sport: SchoolSport): number {
  const idx = SCHOOL_SPORTS.indexOf(sport);
  return idx >= 0 ? idx : 999;
}

function parseAgeGroupNumber(ageGroup: string): number | null {
  const match = ageGroup.trim().match(/u\s*(\d{1,2})/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

export function compareAgeGroupsChronologically(a: string, b: string): number {
  const aNum = parseAgeGroupNumber(a);
  const bNum = parseAgeGroupNumber(b);
  if (aNum != null && bNum != null && aNum !== bNum) return aNum - bNum;
  if (aNum != null && bNum == null) return -1;
  if (aNum == null && bNum != null) return 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function compareTeamsBySportAndChronologicalAge(a: TeamSortShape, b: TeamSortShape): number {
  const sportCmp = sportOrderIndex(a.sport) - sportOrderIndex(b.sport);
  if (sportCmp !== 0) return sportCmp;

  const ageCmp = compareAgeGroupsChronologically(a.ageGroup, b.ageGroup);
  if (ageCmp !== 0) return ageCmp;

  const genderCmp = (a.gender ?? "").localeCompare(b.gender ?? "");
  if (genderCmp !== 0) return genderCmp;

  return a.teamLabel.localeCompare(b.teamLabel, undefined, { numeric: true, sensitivity: "base" });
}
