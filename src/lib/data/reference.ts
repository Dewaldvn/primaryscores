import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { seasons, competitions, provinces } from "@/db/schema";

export async function listSeasons() {
  return db.select().from(seasons).orderBy(desc(seasons.year));
}

export async function getSeason(id: string) {
  const [row] = await db.select().from(seasons).where(eq(seasons.id, id)).limit(1);
  return row ?? null;
}

export async function listCompetitions() {
  return db
    .select({
      id: competitions.id,
      name: competitions.name,
      organiser: competitions.organiser,
      level: competitions.level,
      active: competitions.active,
      provinceId: competitions.provinceId,
      provinceName: provinces.name,
    })
    .from(competitions)
    .leftJoin(provinces, eq(competitions.provinceId, provinces.id))
    .where(eq(competitions.active, true))
    .orderBy(competitions.name);
}

export async function getCompetition(id: string) {
  const [row] = await db
    .select({
      id: competitions.id,
      name: competitions.name,
      organiser: competitions.organiser,
      level: competitions.level,
      active: competitions.active,
      provinceId: competitions.provinceId,
      provinceName: provinces.name,
    })
    .from(competitions)
    .leftJoin(provinces, eq(competitions.provinceId, provinces.id))
    .where(eq(competitions.id, id))
    .limit(1);
  return row ?? null;
}
