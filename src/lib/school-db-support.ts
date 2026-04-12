import { getTableColumns, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/db/schema";

let nicknameColumnResolved = false;
let nicknameColumnPresent = false;

/**
 * Whether `public.schools.nickname` exists (migration 00018).
 * Cached for the process lifetime.
 */
export async function schoolsHasNicknameColumn(): Promise<boolean> {
  if (nicknameColumnResolved) return nicknameColumnPresent;
  const rows = (await db.execute(sql`
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = 'schools'
        and column_name = 'nickname'
    ) as "exists"
  `)) as { exists: boolean }[];
  nicknameColumnPresent = Boolean(rows[0]?.exists);
  nicknameColumnResolved = true;
  return nicknameColumnPresent;
}

const { nickname: _omitNicknameColumn, ...schoolColumnsWithoutNickname } = getTableColumns(schools);
void _omitNicknameColumn;

/** All `schools` columns except `nickname` (for selects when the DB column may not exist yet). */
export { schoolColumnsWithoutNickname };

/** Column map for `db.select(...).from(schools)` when `nickname` may not be migrated yet. */
export function schoolsSelectColumns(includeNickname: boolean) {
  return includeNickname ? getTableColumns(schools) : schoolColumnsWithoutNickname;
}
