import { getTableColumns, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { liveSessions } from "@/db/schema";

let teamGenderColumnResolved = false;
let teamGenderColumnPresent = false;

/**
 * Whether `public.live_sessions.team_gender` exists (migration 00016).
 * Cached for the process lifetime so we avoid `information_schema` on every query.
 */
export async function liveSessionsHasTeamGenderColumn(): Promise<boolean> {
  if (teamGenderColumnResolved) return teamGenderColumnPresent;
  const rows = (await db.execute(sql`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'live_sessions'
        AND column_name = 'team_gender'
    ) AS "exists"
  `)) as { exists: boolean }[];
  teamGenderColumnPresent = Boolean(rows[0]?.exists);
  teamGenderColumnResolved = true;
  return teamGenderColumnPresent;
}

const { teamGender: _omitTeamGenderColumn, ...liveSessionColumnsWithoutTeamGender } =
  getTableColumns(liveSessions);
void _omitTeamGenderColumn;

/** Column map for `db.select(...).from(liveSessions)` — omit `team_gender` when the column is not migrated yet. */
export function liveSessionsSelectColumns(includeTeamGender: boolean) {
  return includeTeamGender ? getTableColumns(liveSessions) : liveSessionColumnsWithoutTeamGender;
}
