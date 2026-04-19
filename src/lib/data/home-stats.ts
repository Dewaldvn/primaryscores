import { cache } from "react";
import { count, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { schools } from "@/db/schema";
import { countVerifiedResults } from "@/lib/data/results";
import { SCHOOL_SPORTS } from "@/lib/sports";

export type HomePageStats = {
  verifiedResults: number;
  schools: number;
  sportsCount: number;
};

export const getHomePageStats = cache(async function getHomePageStats(): Promise<HomePageStats> {
  const [schoolRows, verifiedResults] = await Promise.all([
    db.select({ n: count() }).from(schools).where(eq(schools.active, true)),
    countVerifiedResults({}),
  ]);
  return {
    verifiedResults,
    schools: schoolRows[0]?.n ?? 0,
    sportsCount: SCHOOL_SPORTS.length,
  };
});
