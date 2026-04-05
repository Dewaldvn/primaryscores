/** Normalize free-text school / team names for fuzzy matching. */
function norm(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/** School segment of moderator option label (before age group), tolerating em dash, en dash, or hyphen. */
function schoolPart(label: string): string {
  const stripped = label.replace(/\s*\(inactive\)\s*$/i, "");
  const m = stripped.match(/^(.+?)\s*[\u2013\u2014-]\s+/);
  return norm(m?.[1] ?? stripped);
}

/**
 * Pick a team id for the moderation form: prefer submitted UUID when valid,
 * then match submitted text to option labels (school name segment before " — ").
 */
export function defaultTeamIdFromSubmission(
  proposedName: string,
  proposedTeamId: string | null | undefined,
  teamOptions: { teamId: string; label: string }[]
): string {
  if (proposedTeamId && teamOptions.some((t) => t.teamId === proposedTeamId)) {
    return proposedTeamId;
  }

  const n = norm(proposedName);
  if (!n) return "";

  const byFull = teamOptions.find((t) => norm(t.label) === n);
  if (byFull) return byFull.teamId;

  const bySchoolExact = teamOptions.find((t) => schoolPart(t.label) === n);
  if (bySchoolExact) return bySchoolExact.teamId;

  const minLen = 3;
  const candidates = teamOptions.filter((t) => {
    const school = schoolPart(t.label);
    if (!school && !n) return false;
    if (school === n) return true;
    if (school.length >= minLen && n.length >= minLen) {
      return school.includes(n) || n.includes(school);
    }
    if (school.length >= minLen && n.length >= 2) return school.includes(n);
    if (n.length >= minLen && school.length >= 2) return n.includes(school);
    return false;
  });

  if (candidates.length === 1) return candidates[0]!.teamId;
  if (candidates.length > 1) {
    const sorted = [...candidates].sort((a, b) => a.label.localeCompare(b.label));
    return sorted[0]!.teamId;
  }

  return "";
}
