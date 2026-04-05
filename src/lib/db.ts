import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";
import { assertDatabaseUrlReady } from "@/lib/database-url";

declare global {
  // eslint-disable-next-line no-var
  var __prssa_postgres: ReturnType<typeof postgres> | undefined;
}

/** Raise Postgres session statement_timeout so simple queries are not killed by aggressive pool defaults. */
const SESSION_STATEMENT_TIMEOUT_MS = 120_000;

function mergeStatementTimeout(urlString: string): string {
  if (/statement_timeout/i.test(urlString)) return urlString;
  const u = new URL(urlString);
  const add = `-c statement_timeout=${SESSION_STATEMENT_TIMEOUT_MS}`;
  const prev = u.searchParams.get("options");
  u.searchParams.set("options", prev ? `${prev} ${add}` : add);
  return u.toString();
}

function createClient() {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env.local and add your Supabase connection string."
    );
  }
  assertDatabaseUrlReady(raw);
  const url = mergeStatementTimeout(raw);
  if (!globalThis.__prssa_postgres) {
    globalThis.__prssa_postgres = postgres(url, {
      prepare: false,
      /** Was 1: every query waited behind the previous one (very slow pages). Pooler supports several client conns. */
      max: 8,
      connect_timeout: 12,
    });
  }
  return globalThis.__prssa_postgres;
}

let _db: ReturnType<typeof drizzle<typeof schema>> | undefined;

function getDrizzle() {
  if (!_db) {
    _db = drizzle(createClient(), { schema });
  }
  return _db;
}

/**
 * Lazy Drizzle instance: first query throws a clear error if DATABASE_URL is missing.
 */
export const db = new Proxy({} as ReturnType<typeof getDrizzle>, {
  get(_, prop) {
    const instance = getDrizzle();
    return Reflect.get(instance as object, prop, instance);
  },
});

/** Close pool (CLI scripts only). Next.js keeps the process alive; do not call from routes. */
export async function closeDatabase(): Promise<void> {
  _db = undefined;
  if (globalThis.__prssa_postgres) {
    await globalThis.__prssa_postgres.end({ timeout: 5 });
    globalThis.__prssa_postgres = undefined;
  }
}
