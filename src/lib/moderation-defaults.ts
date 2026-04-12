import { SCHOOL_SPORTS, type SchoolSport } from "@/lib/sports";

/** Normalize free-text school / team names for fuzzy matching. */
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export type ModerationTeamOption = {
  teamId: string;
  label: string;
  sport: SchoolSport;
  schoolName: string;
  teamLabel: string;
};

export type ModerationSubmissionRow = {
  notes: string | null;
  proposedHomeTeamId: string | null;
  proposedAwayTeamId: string | null;
};

/** Parse `sport=RUGBY` etc. from live-session or other automated submission notes. */
export function parseSportFromSubmissionNotes(notes: string | null | undefined): SchoolSport | undefined {
  const m = (notes ?? "").match(/\bsport=(RUGBY|NETBALL|HOCKEY|SOCCER)\b/i);
  if (!m?.[1]) return undefined;
  const u = m[1].toUpperCase();
  return (SCHOOL_SPORTS as readonly string[]).includes(u) ? (u as SchoolSport) : undefined;
}

/** Best guess sport for this submission (notes, then known team IDs). */
export function inferSportForModeration(
  row: ModerationSubmissionRow,
  teamOptions: ModerationTeamOption[]
): SchoolSport {
  const fromNotes = parseSportFromSubmissionNotes(row.notes);
  if (fromNotes) return fromNotes;

  const home = row.proposedHomeTeamId
    ? teamOptions.find((t) => t.teamId === row.proposedHomeTeamId)
    : undefined;
  const away = row.proposedAwayTeamId
    ? teamOptions.find((t) => t.teamId === row.proposedAwayTeamId)
    : undefined;
  if (home && away && home.sport === away.sport) return home.sport;
  if (home) return home.sport;
  if (away) return away.sport;

  return "RUGBY";
}

/** Sport filter for the moderation UI: inferred sport if we have teams for it, else first sport with any team. */
export function pickModerationSportFilter(
  row: ModerationSubmissionRow,
  teamOptions: ModerationTeamOption[]
): SchoolSport {
  const inferred = inferSportForModeration(row, teamOptions);
  if (teamOptions.some((t) => t.sport === inferred)) return inferred;
  const first = SCHOOL_SPORTS.find((s) => teamOptions.some((t) => t.sport === s));
  return first ?? "RUGBY";
}

/**
 * Pick a team id for the moderation form: prefer submitted UUID when valid,
 * then match submitted text to school name, team label, or fuzzy substring.
 */
export function defaultTeamIdFromSubmission(
  proposedName: string,
  proposedTeamId: string | null | undefined,
  teamOptions: ModerationTeamOption[]
): string {
  if (proposedTeamId && teamOptions.some((t) => t.teamId === proposedTeamId)) {
    return proposedTeamId;
  }

  const n = norm(proposedName);
  if (!n) return "";

  const bySchoolExact = teamOptions.find((t) => norm(t.schoolName) === n);
  if (bySchoolExact) return bySchoolExact.teamId;

  const byTeamLabelExact = teamOptions.find((t) => norm(t.teamLabel) === n);
  if (byTeamLabelExact) return byTeamLabelExact.teamId;

  const byFullLabel = teamOptions.find((t) => norm(t.label.replace(/\s*\(inactive\)\s*$/i, "")) === n);
  if (byFullLabel) return byFullLabel.teamId;

  const minLen = 3;
  const candidates = teamOptions.filter((t) => {
    const school = norm(t.schoolName);
    const tl = norm(t.teamLabel);
    if (school === n || tl === n) return true;
    if (school.length >= minLen && n.length >= minLen) {
      if (school.includes(n) || n.includes(school)) return true;
    }
    if (tl.length >= minLen && n.length >= minLen) {
      if (tl.includes(n) || n.includes(tl)) return true;
    }
    if (school.length >= minLen && n.length >= 2 && school.includes(n)) return true;
    if (tl.length >= minLen && n.length >= 2 && tl.includes(n)) return true;
    if (n.length >= minLen && school.length >= 2 && n.includes(school)) return true;
    if (n.length >= minLen && tl.length >= 2 && n.includes(tl)) return true;
    return false;
  });

  if (candidates.length === 1) return candidates[0]!.teamId;
  if (candidates.length > 1) {
    const sorted = [...candidates].sort((a, b) => a.label.localeCompare(b.label));
    return sorted[0]!.teamId;
  }

  return "";
}
