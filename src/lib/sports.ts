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

/** Brand tile on sport hub: “Contribute to live scoring”. */
export function contributeToLiveScoringTileImage(sport: SchoolSport): {
  src: string;
  width: number;
  height: number;
} {
  switch (sport) {
    case "SOCCER":
      return { src: "/brand/contribute_to_live_scoring_soccer.png", width: 489, height: 514 };
    case "HOCKEY":
      return { src: "/brand/contribute_to_live_scoring_hockey.png", width: 486, height: 482 };
    case "NETBALL":
      return { src: "/brand/contribute_to_live_scoring_netball.png", width: 493, height: 513 };
    case "RUGBY":
      return { src: "/brand/contribute_to_live_scoring.png", width: 800, height: 500 };
  }
}

/** Brand tile on sport hub: “Submit a previous score”. */
export function submitPreviousScoreTileImage(sport: SchoolSport): {
  src: string;
  width: number;
  height: number;
} {
  switch (sport) {
    case "SOCCER":
      return { src: "/brand/submit_previous_soccer.png", width: 500, height: 491 };
    case "HOCKEY":
      return { src: "/brand/submit_previous_hockey.png", width: 483, height: 494 };
    case "NETBALL":
      return { src: "/brand/submit_previous_netball.png", width: 500, height: 491 };
    case "RUGBY":
      return { src: "/brand/submit_a_score.png", width: 729, height: 675 };
  }
}
