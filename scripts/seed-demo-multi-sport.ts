import "./env-bootstrap";
import { eq, like } from "drizzle-orm";
import { closeDatabase, db } from "../src/lib/db";
import {
  schools,
  teams,
  provinces,
  seasons,
  competitions,
  fixtures,
  results,
} from "../src/db/schema";

const DEMO_SCHOOL_SLUG_PREFIX = "demo-multisport-";

const DEMO_SCHOOLS = [
  { officialName: "Demo Multisport North A School", displayName: "Demo MS North A", slugSuffix: "north-a" },
  { officialName: "Demo Multisport North B School", displayName: "Demo MS North B", slugSuffix: "north-b" },
  { officialName: "Demo Multisport East A School", displayName: "Demo MS East A", slugSuffix: "east-a" },
  { officialName: "Demo Multisport East B School", displayName: "Demo MS East B", slugSuffix: "east-b" },
  { officialName: "Demo Multisport South A School", displayName: "Demo MS South A", slugSuffix: "south-a" },
  { officialName: "Demo Multisport South B School", displayName: "Demo MS South B", slugSuffix: "south-b" },
] as const;

type SchoolRow = typeof schools.$inferSelect;
type TeamRow = typeof teams.$inferSelect;

async function main() {
  const existingDemo = await db
    .select()
    .from(schools)
    .where(like(schools.slug, `${DEMO_SCHOOL_SLUG_PREFIX}%`))
    .limit(1);

  if (existingDemo.length > 0) {
    console.log(
      "Demo multisport schools already exist (slug prefix demo-multisport-). Skipping.",
    );
    return;
  }

  const [gp] = await db
    .select()
    .from(provinces)
    .where(eq(provinces.code, "GP"))
    .limit(1);

  if (!gp) {
    console.error("Province GP not found. Run main seed or add provinces first.");
    process.exit(1);
  }

  let seasonRows = await db
    .select()
    .from(seasons)
    .where(eq(seasons.year, 2026))
    .limit(1);

  if (!seasonRows[0]) {
    const [s] = await db
      .insert(seasons)
      .values({
        year: 2026,
        name: "2026",
        startDate: "2026-01-15",
        endDate: "2026-09-30",
      })
      .returning();
    seasonRows = [s];
  }

  const seasonId = seasonRows[0].id;

  const [compNetball] = await db
    .insert(competitions)
    .values({
      name: "Demo Netball Inter-schools (seed)",
      provinceId: gp.id,
      organiser: "Demo seed",
      level: "Inter-school",
      active: true,
    })
    .returning();

  const [compHockey] = await db
    .insert(competitions)
    .values({
      name: "Demo Hockey League (seed)",
      provinceId: gp.id,
      organiser: "Demo seed",
      level: "League",
      active: true,
    })
    .returning();

  const [compSoccer] = await db
    .insert(competitions)
    .values({
      name: "Demo Soccer Cup (seed)",
      provinceId: gp.id,
      organiser: "Demo seed",
      level: "Cup",
      active: true,
    })
    .returning();

  const insertedSchools: SchoolRow[] = [];

  for (const s of DEMO_SCHOOLS) {
    const slug = `${DEMO_SCHOOL_SLUG_PREFIX}${s.slugSuffix}`;
    const [row] = await db
      .insert(schools)
      .values({
        officialName: s.officialName,
        displayName: s.displayName,
        slug,
        provinceId: gp.id,
        district: "Demo district",
        town: "Johannesburg",
        active: true,
      })
      .returning();
    insertedSchools.push(row);
  }

  const [nA, nB, eA, eB, sA, sB] = insertedSchools;

  const teamRows = await db
    .insert(teams)
    .values([
      {
        schoolId: nA.id,
        ageGroup: "U13",
        teamLabel: "Netball A",
        sport: "NETBALL",
        gender: null,
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: nB.id,
        ageGroup: "U13",
        teamLabel: "Netball A",
        sport: "NETBALL",
        gender: null,
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: eA.id,
        ageGroup: "U13",
        teamLabel: "Netball A",
        sport: "NETBALL",
        gender: null,
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: eB.id,
        ageGroup: "U13",
        teamLabel: "Netball A",
        sport: "NETBALL",
        gender: null,
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: eA.id,
        ageGroup: "U13",
        teamLabel: "Boys A",
        sport: "HOCKEY",
        gender: "MALE",
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: eB.id,
        ageGroup: "U13",
        teamLabel: "Boys A",
        sport: "HOCKEY",
        gender: "MALE",
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: sA.id,
        ageGroup: "U13",
        teamLabel: "Boys A",
        sport: "HOCKEY",
        gender: "MALE",
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: sB.id,
        ageGroup: "U13",
        teamLabel: "Boys A",
        sport: "HOCKEY",
        gender: "MALE",
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: eA.id,
        ageGroup: "U13",
        teamLabel: "Girls A",
        sport: "HOCKEY",
        gender: "FEMALE",
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: eB.id,
        ageGroup: "U13",
        teamLabel: "Girls A",
        sport: "HOCKEY",
        gender: "FEMALE",
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: sA.id,
        ageGroup: "U13",
        teamLabel: "Girls A",
        sport: "HOCKEY",
        gender: "FEMALE",
        isFirstTeam: true,
        active: true,
      },
      {
        schoolId: sB.id,
        ageGroup: "U13",
        teamLabel: "Girls A",
        sport: "HOCKEY",
        gender: "FEMALE",
        isFirstTeam: true,
        active: true,
      },
      ...insertedSchools.map(
        (sch): typeof teams.$inferInsert => ({
          schoolId: sch.id,
          ageGroup: "U13",
          teamLabel: "Soccer A",
          sport: "SOCCER",
          gender: null,
          isFirstTeam: true,
          active: true,
        }),
      ),
    ])
    .returning();

  function byKey(
    sport: "NETBALL" | "HOCKEY" | "SOCCER",
    schoolSlugSuffix: string,
    teamLabel: string,
  ): TeamRow {
    const school = insertedSchools.find(
      (x) => x.slug === `${DEMO_SCHOOL_SLUG_PREFIX}${schoolSlugSuffix}`,
    );
    if (!school) throw new Error(`School ${schoolSlugSuffix} not found`);
    const t = teamRows.find(
      (r) =>
        r.schoolId === school.id &&
        r.sport === sport &&
        r.teamLabel === teamLabel,
    );
    if (!t) throw new Error(`Team not found ${sport} ${schoolSlugSuffix} ${teamLabel}`);
    return t;
  }

  const baseYmd = "2026-03-15";

  type FixtureSpec = {
    home: TeamRow;
    away: TeamRow;
    homeScore: number;
    awayScore: number;
    competitionId: string;
    offsetDays: number;
  };

  const specs: FixtureSpec[] = [
    {
      home: byKey("NETBALL", "north-a", "Netball A"),
      away: byKey("NETBALL", "north-b", "Netball A"),
      homeScore: 12,
      awayScore: 8,
      competitionId: compNetball.id,
      offsetDays: 0,
    },
    {
      home: byKey("NETBALL", "north-b", "Netball A"),
      away: byKey("NETBALL", "east-a", "Netball A"),
      homeScore: 10,
      awayScore: 14,
      competitionId: compNetball.id,
      offsetDays: 1,
    },
    {
      home: byKey("NETBALL", "east-a", "Netball A"),
      away: byKey("NETBALL", "east-b", "Netball A"),
      homeScore: 15,
      awayScore: 11,
      competitionId: compNetball.id,
      offsetDays: 2,
    },
    {
      home: byKey("NETBALL", "north-a", "Netball A"),
      away: byKey("NETBALL", "east-b", "Netball A"),
      homeScore: 9,
      awayScore: 9,
      competitionId: compNetball.id,
      offsetDays: 3,
    },
    {
      home: byKey("HOCKEY", "south-a", "Boys A"),
      away: byKey("HOCKEY", "south-b", "Boys A"),
      homeScore: 2,
      awayScore: 1,
      competitionId: compHockey.id,
      offsetDays: 4,
    },
    {
      home: byKey("HOCKEY", "south-a", "Girls A"),
      away: byKey("HOCKEY", "south-b", "Girls A"),
      homeScore: 1,
      awayScore: 3,
      competitionId: compHockey.id,
      offsetDays: 5,
    },
    {
      home: byKey("HOCKEY", "east-a", "Boys A"),
      away: byKey("HOCKEY", "east-b", "Boys A"),
      homeScore: 0,
      awayScore: 2,
      competitionId: compHockey.id,
      offsetDays: 6,
    },
    {
      home: byKey("SOCCER", "north-a", "Soccer A"),
      away: byKey("SOCCER", "north-b", "Soccer A"),
      homeScore: 3,
      awayScore: 1,
      competitionId: compSoccer.id,
      offsetDays: 7,
    },
    {
      home: byKey("SOCCER", "east-a", "Soccer A"),
      away: byKey("SOCCER", "east-b", "Soccer A"),
      homeScore: 2,
      awayScore: 2,
      competitionId: compSoccer.id,
      offsetDays: 8,
    },
    {
      home: byKey("SOCCER", "south-a", "Soccer A"),
      away: byKey("SOCCER", "south-b", "Soccer A"),
      homeScore: 4,
      awayScore: 0,
      competitionId: compSoccer.id,
      offsetDays: 9,
    },
  ];

  const publishedAt = new Date();

  for (const spec of specs) {
    const d = new Date(`${baseYmd}T12:00:00.000Z`);
    d.setUTCDate(d.getUTCDate() + spec.offsetDays);
    const ymd = d.toISOString().slice(0, 10);

    const [fx] = await db
      .insert(fixtures)
      .values({
        homeTeamId: spec.home.id,
        awayTeamId: spec.away.id,
        matchDate: ymd,
        venue: "Demo multisport seed",
        status: "PLAYED",
        seasonId,
        competitionId: spec.competitionId,
      })
      .returning();

    await db.insert(results).values({
      fixtureId: fx.id,
      homeScore: spec.homeScore,
      awayScore: spec.awayScore,
      isVerified: true,
      verificationLevel: "MODERATOR_VERIFIED",
      publishedAt,
    });
  }

  console.log(
    `Inserted ${insertedSchools.length} demo schools, ${teamRows.length} teams, ${specs.length} fixtures with verified results (netball ×4, hockey ×3, soccer ×3).`,
  );
  console.log(`School slugs: ${insertedSchools.map((s) => s.slug).join(", ")}`);
}

main()
  .then(() => closeDatabase())
  .catch(async (e) => {
    console.error(e);
    await closeDatabase().catch(() => {});
    process.exit(1);
  });
