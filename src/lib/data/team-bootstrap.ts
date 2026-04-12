import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools, teams } from "@/db/schema";

const DEFAULT_U13_LABEL = "A";

/**
 * Fixtures and moderation need `teams.id` rows. Schools alone do not appear in team pick-lists.
 * Creates a default U13 side for any active school that has no U13 team yet (idempotent).
 */
export async function ensureU13TeamsForSchoolsMissingThem(): Promise<void> {
  const activeSchools = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.active, true));

  if (activeSchools.length === 0) return;

  const u13Rows = await db
    .select({ schoolId: teams.schoolId })
    .from(teams)
    .where(and(eq(teams.ageGroup, "U13"), eq(teams.sport, "RUGBY")));

  const hasU13 = new Set(u13Rows.map((r) => r.schoolId));
  const missing = activeSchools.filter((s) => !hasU13.has(s.id));

  if (missing.length === 0) return;

  await db.insert(teams).values(
    missing.map((row) => ({
      schoolId: row.id,
      ageGroup: "U13",
      teamLabel: DEFAULT_U13_LABEL,
      isFirstTeam: true,
      active: true,
    }))
  );
}
