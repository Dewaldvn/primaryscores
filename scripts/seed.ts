import "./env-bootstrap";
import { closeDatabase, db } from "../src/lib/db";
import {
  provinces,
  schools,
  teams,
  seasons,
  competitions,
  fixtures,
  results,
} from "../src/db/schema";
import { slugify } from "../src/lib/slug";
import { eq, count } from "drizzle-orm";

async function main() {
  console.log("Seeding Schools Scores SA demo data…");

  const [{ n: existingResults }] = await db.select({ n: count() }).from(results);
  if (existingResults >= 15) {
    console.log(
      `Database already has ${existingResults} result row(s); skipping seed (safe re-run). No changes made.`
    );
    return;
  }

  const provinceRows = [
    { code: "EC", name: "Eastern Cape" },
    { code: "FS", name: "Free State" },
    { code: "GP", name: "Gauteng" },
    { code: "KZN", name: "KwaZulu-Natal" },
    { code: "LP", name: "Limpopo" },
    { code: "MP", name: "Mpumalanga" },
    { code: "NC", name: "Northern Cape" },
    { code: "NW", name: "North West" },
    { code: "WC", name: "Western Cape" },
  ];

  await db.insert(provinces).values(provinceRows).onConflictDoNothing({ target: provinces.code });

  const prov = await db.select().from(provinces);
  const byCode = Object.fromEntries(prov.map((p) => [p.code, p.id])) as Record<string, string>;

  const schoolSeeds = [
    {
      officialName: "Paul Roos Gymnasium",
      displayName: "Paul Roos",
      code: "WC",
      town: "Stellenbosch",
    },
    {
      officialName: "Grey College",
      displayName: "Grey College",
      code: "FS",
      town: "Bloemfontein",
    },
    {
      officialName: "Bishops Diocesan College",
      displayName: "Bishops",
      code: "WC",
      town: "Cape Town",
    },
    {
      officialName: "Hilton College",
      displayName: "Hilton College",
      code: "KZN",
      town: "Hilton",
    },
    {
      officialName: "Jeppe High School for Boys",
      displayName: "Jeppe High",
      code: "GP",
      town: "Johannesburg",
    },
    {
      officialName: "Pretoria Boys High School",
      displayName: "PBHS",
      code: "GP",
      town: "Pretoria",
    },
    {
      officialName: "SACS",
      displayName: "SACS",
      code: "WC",
      town: "Cape Town",
    },
    {
      officialName: "Grey High School",
      displayName: "Grey High PE",
      code: "EC",
      town: "Gqeberha",
    },
  ];

  const schoolIds: string[] = [];

  for (const s of schoolSeeds) {
    const slug = slugify(s.displayName);
    const [existing] = await db.select().from(schools).where(eq(schools.slug, slug)).limit(1);
    if (existing) {
      schoolIds.push(existing.id);
      continue;
    }
    const [ins] = await db
      .insert(schools)
      .values({
        officialName: s.officialName,
        displayName: s.displayName,
        slug,
        provinceId: byCode[s.code],
        town: s.town,
        active: true,
      })
      .returning({ id: schools.id });
    schoolIds.push(ins.id);
  }

  const teamIds: string[] = [];
  for (const schoolId of schoolIds) {
    const [t] = await db.select().from(teams).where(eq(teams.schoolId, schoolId)).limit(1);
    if (t) {
      teamIds.push(t.id);
      continue;
    }
    const [ins] = await db
      .insert(teams)
      .values({
        schoolId,
        ageGroup: "U13",
        teamLabel: "A",
        isFirstTeam: true,
        active: true,
      })
      .returning({ id: teams.id });
    teamIds.push(ins.id);
  }

  let season2023 = await db.select().from(seasons).where(eq(seasons.year, 2023)).limit(1);
  if (season2023.length === 0) {
    await db.insert(seasons).values({
      year: 2023,
      name: "2023 season",
      startDate: "2023-03-01",
      endDate: "2023-09-30",
    });
    season2023 = await db.select().from(seasons).where(eq(seasons.year, 2023)).limit(1);
  }

  let season2024 = await db.select().from(seasons).where(eq(seasons.year, 2024)).limit(1);
  if (season2024.length === 0) {
    await db.insert(seasons).values({
      year: 2024,
      name: "2024 season",
      startDate: "2024-03-01",
      endDate: "2024-09-30",
    });
    season2024 = await db.select().from(seasons).where(eq(seasons.year, 2024)).limit(1);
  }

  const s2023 = season2023[0];
  const s2024 = season2024[0];

  async function ensureComp(name: string, provinceCode: string | null, level: string) {
    const [ex] = await db.select().from(competitions).where(eq(competitions.name, name)).limit(1);
    if (ex) return ex.id;
    const [c] = await db
      .insert(competitions)
      .values({
        name,
        provinceId: provinceCode ? byCode[provinceCode] : null,
        organiser: "Demo rugby union",
        level,
        active: true,
      })
      .returning({ id: competitions.id });
    return c.id;
  }

  const compWc = await ensureComp("Western Cape U13 Inter-schools", "WC", "Inter-school");
  const compNational = await ensureComp("SA Primary Invitational", null, "Invitational");
  const compGp = await ensureComp("Gauteng Primary Week", "GP", "Provincial");

  const scorePairs: [number, number][] = [
    [12, 7],
    [21, 14],
    [10, 10],
    [17, 5],
    [8, 15],
    [25, 12],
    [3, 19],
    [14, 14],
    [31, 0],
    [9, 12],
    [18, 18],
    [7, 22],
    [13, 11],
    [28, 21],
    [5, 5],
    [11, 24],
    [16, 9],
    [20, 17],
    [4, 14],
    [22, 19],
    [15, 15],
    [19, 8],
    [6, 18],
    [27, 10],
  ];

  const roundPairs: [number, number][] = [];
  for (let i = 0; i < teamIds.length; i++) {
    for (let j = i + 1; j < teamIds.length; j++) {
      roundPairs.push([i, j]);
    }
  }

  const baseDate2024 = new Date("2024-04-15T12:00:00Z");

  for (let idx = 0; idx < Math.min(scorePairs.length, roundPairs.length); idx++) {
    const [ti, tj] = roundPairs[idx];
    const home = teamIds[ti];
    const away = teamIds[tj];
    const [hs, as] = scorePairs[idx % scorePairs.length];
    const matchDay = new Date(baseDate2024);
    matchDay.setDate(matchDay.getDate() + idx * 3);
    const ymd = matchDay.toISOString().slice(0, 10);

    const competitionId = idx % 3 === 0 ? compWc : idx % 3 === 1 ? compNational : compGp;

    const [fx] = await db
      .insert(fixtures)
      .values({
        seasonId: s2024.id,
        competitionId,
        matchDate: ymd,
        homeTeamId: home,
        awayTeamId: away,
        venue: "School field",
        status: "PLAYED",
      })
      .returning({ id: fixtures.id });

    const [existingRes] = await db.select().from(results).where(eq(results.fixtureId, fx.id)).limit(1);
    if (!existingRes) {
      await db.insert(results).values({
        fixtureId: fx.id,
        homeScore: hs,
        awayScore: as,
        isVerified: true,
        verificationLevel: idx % 5 === 0 ? "SOURCE_VERIFIED" : "MODERATOR_VERIFIED",
        publishedAt: new Date(),
      });
    }
  }

  // A few 2023 results for archive feel
  for (let idx = 0; idx < 4; idx++) {
    const home = teamIds[idx];
    const away = teamIds[idx + 3];
    const [hs, as] = scorePairs[idx + 10];
    const [fx] = await db
      .insert(fixtures)
      .values({
        seasonId: s2023.id,
        competitionId: compNational,
        matchDate: `2023-05-${10 + idx}`,
        homeTeamId: home,
        awayTeamId: away,
        venue: "Neutral venue",
        status: "PLAYED",
      })
      .returning({ id: fixtures.id });
    const [existingRes] = await db.select().from(results).where(eq(results.fixtureId, fx.id)).limit(1);
    if (!existingRes) {
      await db.insert(results).values({
        fixtureId: fx.id,
        homeScore: hs,
        awayScore: as,
        isVerified: true,
        verificationLevel: "MODERATOR_VERIFIED",
        publishedAt: new Date(),
      });
    }
  }

  console.log("Seed complete.");
  console.log(`
Next steps for demo accounts (Supabase Auth):
1. Sign up (or create in dashboard) users:
   - moderator@primaryrugby.local
   - admin@primaryrugby.local
2. Then run in SQL editor:
   update public.profiles set role = 'MODERATOR' where email = 'moderator@primaryrugby.local';
   update public.profiles set role = 'ADMIN' where email = 'admin@primaryrugby.local';
`);
}

main()
  .then(() => closeDatabase())
  .catch(async (e) => {
    console.error(e);
    await closeDatabase().catch(() => {});
    process.exit(1);
  });
