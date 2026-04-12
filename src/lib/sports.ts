/** Matches Postgres enum `school_sport` and Drizzle `schoolSportEnum`. */
export const SCHOOL_SPORTS = ["RUGBY", "NETBALL", "HOCKEY", "SOCCER"] as const;
export type SchoolSport = (typeof SCHOOL_SPORTS)[number];

const LABELS: Record<SchoolSport, string> = {
  RUGBY: "Rugby",
  NETBALL: "Netball",
  HOCKEY: "Hockey",
  SOCCER: "Soccer",
};

export function schoolSportLabel(s: SchoolSport): string {
  return LABELS[s];
}

/** Parse `?sport=` from URLs; invalid values become `undefined`. */
export function parseSportQueryParam(v: string | null | undefined): SchoolSport | undefined {
  if (!v) return undefined;
  const u = v.trim().toUpperCase();
  return (SCHOOL_SPORTS as readonly string[]).includes(u) ? (u as SchoolSport) : undefined;
}

/** URL segment under `/sport/[slug]` (lowercase). */
export const SPORT_ROUTE_SLUGS = ["rugby", "netball", "hockey", "soccer"] as const;
export type SportRouteSlug = (typeof SPORT_ROUTE_SLUGS)[number];

const SLUG_TO_SPORT: Record<SportRouteSlug, SchoolSport> = {
  rugby: "RUGBY",
  netball: "NETBALL",
  hockey: "HOCKEY",
  soccer: "SOCCER",
};

const SPORT_TO_SLUG: Record<SchoolSport, SportRouteSlug> = {
  RUGBY: "rugby",
  NETBALL: "netball",
  HOCKEY: "hockey",
  SOCCER: "soccer",
};

export function sportFromRouteSlug(slug: string): SchoolSport | undefined {
  const k = slug.trim().toLowerCase() as SportRouteSlug;
  return SLUG_TO_SPORT[k];
}

export function sportToRouteSlug(s: SchoolSport): SportRouteSlug {
  return SPORT_TO_SLUG[s];
}
