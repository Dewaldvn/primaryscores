/**
 * Validates DATABASE_URL before opening a Postgres client.
 * Catches common Supabase copy-paste mistakes with actionable errors.
 */
export function assertDatabaseUrlReady(raw: string): void {
  const urlString = raw.trim();
  if (!urlString) {
    throw new Error("DATABASE_URL is empty.");
  }

  const templateMarkers = [
    /postgres\.\[REF\]/i,
    /\[REF\]/i,
    /\[PASSWORD\]/i,
    /\[YOUR-PASSWORD\]/i,
    /aws-0-\[REGION\]/i,
    /\[REGION\]/i,
  ];
  if (templateMarkers.some((re) => re.test(urlString))) {
    throw new Error(
      "DATABASE_URL still contains template text like [REF] or [PASSWORD]. " +
        "In Supabase: open your project and click Connect (top of the page), choose Transaction pooler (port 6543), copy the URI, and replace [YOUR-PASSWORD] with your database password (Project Settings → Database to reset it)."
    );
  }

  let url: URL;
  try {
    url = new URL(urlString);
  } catch {
    throw new Error(
      "DATABASE_URL is not a valid URL. Put the whole value in double quotes in .env.local. " +
        "If the password contains @ # % or spaces, URL-encode it (e.g. @ → %40, # → %23)."
    );
  }

  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`DATABASE_URL must start with postgresql:// (got protocol "${url.protocol}").`);
  }

  const user = decodeURIComponent(url.username || "");
  const isPooler =
    url.port === "6543" && url.hostname.includes("pooler.supabase.com");

  if (isPooler && user === "postgres") {
    throw new Error(
      'Supabase transaction pooler (port 6543) cannot use database user "postgres". ' +
        'Use the pooler username from the dashboard: postgres.<project-ref> (e.g. postgres.abcdefghijklmnop). ' +
        "Dashboard → Connect → Transaction pooler (see Supabase docs: connecting to Postgres)."
    );
  }

}
