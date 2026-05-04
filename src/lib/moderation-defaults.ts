import { sameAgeGroupBand } from "@/lib/age-group-match";
import { SCHOOL_SPORTS, type SchoolSport } from "@/lib/sports";

/** Normalize free-text school / team names for fuzzy matching. */
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** First age-band token in free text (e.g. "u16a", "U16"). */
function firstAgeToken(text: string): string | null {
  const m = text.match(/\bU\s*\d{1,2}[A-Za-z]*/i);
  return m ? m[0].replace(/\s+/g, "") : null;
}

export type ModerationTeamOption = {
  teamId: string;
  label: string;
  sport: SchoolSport;
  schoolName: string;
  teamLabel: string;
  /** Helps align dropdown defaults with submitted names (e.g. U16 vs U16A). */
  ageGroup: string;
  gender: string | null;
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

function normFullTeamOption(t: ModerationTeamOption): string {
  const inactive = t.label.replace(/\s*\(inactive\)\s*$/i, "").trim();
  return norm(inactive);
}

function genderMatchesProposed(t: ModerationTeamOption, proposed: string): boolean {
  if (!t.gender) return true;
  const g = t.gender.toLowerCase();
  const p = proposed.toLowerCase();
  if (g === "boys" || g === "girls") {
    return p.includes(g);
  }
  return true;
}

/**
 * Pick a team id for the moderation form: prefer submitted UUID when valid,
 * then match submitted text to directory rows using school name, age band, and team label.
 * Returns "" when ambiguous so moderators must choose explicitly.
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

  const exactFull = teamOptions.find((t) => normFullTeamOption(t) === n);
  if (exactFull) return exactFull.teamId;

  const uniqueSchoolName = teamOptions.filter((t) => norm(t.schoolName) === n);
  if (uniqueSchoolName.length === 1) return uniqueSchoolName[0]!.teamId;

  let pool = teamOptions.filter((t) => genderMatchesProposed(t, proposedName));

  const uTok = firstAgeToken(proposedName);
  if (uTok) {
    const byAge = pool.filter((t) => sameAgeGroupBand(t.ageGroup, uTok));
    if (byAge.length > 0) pool = byAge;
  }

  const schoolHits = pool.filter(
    (t) =>
      n.includes(norm(t.schoolName)) ||
      norm(t.schoolName)
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .some((w) => n.includes(w))
  );
  const scoped = schoolHits.length > 0 ? schoolHits : pool;

  const withTeamLabel = scoped.filter(
    (t) => norm(t.teamLabel).length > 0 && n.includes(norm(t.teamLabel))
  );
  if (withTeamLabel.length === 1) return withTeamLabel[0]!.teamId;

  if (scoped.length === 1) return scoped[0]!.teamId;
  if (withTeamLabel.length > 1 || scoped.length > 1) return "";

  const minLen = 3;
  const fuzzy = pool.filter((t) => {
    const school = norm(t.schoolName);
    const tl = norm(t.teamLabel);
    if (school === n || tl === n) return true;
    if (school.length >= minLen && (school.includes(n) || n.includes(school))) return true;
    if (tl.length >= minLen && (tl.includes(n) || n.includes(tl))) return true;
    return false;
  });
  if (fuzzy.length === 1) return fuzzy[0]!.teamId;
  return "";
}
