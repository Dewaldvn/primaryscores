import { NextResponse } from "next/server";
import { and, eq, inArray, or, sql } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { fixtures, results, schools, teams } from "@/db/schema";
import { parseUploadedTable } from "@/lib/tabular";

const verificationLevelSchema = z.enum([
  "SUBMITTED",
  "MODERATOR_VERIFIED",
  "SOURCE_VERIFIED",
]);

const csvRowSchema = z.object({
  match_date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD"),
  home_school_official_name: z.string().trim().optional().default(""),
  home_school_slug: z.string().trim().optional().default(""),
  away_school_official_name: z.string().trim().optional().default(""),
  away_school_slug: z.string().trim().optional().default(""),
  home_score: z.coerce.number().int().min(0).max(500),
  away_score: z.coerce.number().int().min(0).max(500),
  venue: z.string().trim().optional().default(""),
  season_id: z.string().trim().optional().default(""),
  competition_id: z.string().trim().optional().default(""),
  is_verified: z
    .union([z.string(), z.boolean()])
    .optional()
    .default("false")
    .transform((v) => {
      if (typeof v === "boolean") return v;
      const s = String(v).trim().toLowerCase();
      return s === "true" || s === "1" || s === "yes" || s === "y";
    }),
  verification_level: z
    .string()
    .trim()
    .optional()
    .default("")
    .transform((v) => (v.length ? v : undefined))
    .pipe(verificationLevelSchema.optional()),
});

type ImportOkRow = {
  rowNumber: number;
  fixtureId: string;
  resultId: string;
  action: "created" | "attached_to_existing_fixture";
};

type ImportErrRow = {
  rowNumber: number;
  error: string;
};

export async function POST(req: Request) {
  await requireRole(["ADMIN"]);

  const fd = await req.formData();
  const file = fd.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { ok: false, error: "Missing file upload (field name: file)." },
      { status: 400 }
    );
  }

  const parsed = await parseUploadedTable(file);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }
  const rawRows = (parsed.rows ?? []).filter((r) =>
    Object.values(r ?? {}).some((v) => String(v ?? "").trim().length > 0)
  );

  if (rawRows.length === 0) {
    return NextResponse.json({ ok: false, error: "CSV had no data rows." }, { status: 400 });
  }

  const okRows: Array<z.infer<typeof csvRowSchema> & { rowNumber: number }> = [];
  const errors: ImportErrRow[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2; // +1 header, +1 1-index
    const res = csvRowSchema.safeParse(rawRows[i]);
    if (!res.success) {
      errors.push({
        rowNumber,
        error: res.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "),
      });
      continue;
    }
    okRows.push({ ...res.data, rowNumber });
  }

  if (okRows.length === 0) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const norm = (s: string) => s.trim().toLowerCase();

  type ResolvedRow = (z.infer<typeof csvRowSchema> & {
    rowNumber: number;
    homeTeamId: string;
    awayTeamId: string;
  });

  const resolved: ResolvedRow[] = [];

  // Gather keys used for lookup.
  const slugs = Array.from(
    new Set(
      okRows
        .flatMap((r) => [r.home_school_slug, r.away_school_slug])
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
  const officialNames = Array.from(
    new Set(
      okRows
        .flatMap((r) => [r.home_school_official_name, r.away_school_official_name])
        .map((s) => s.trim())
        .filter(Boolean)
        .map(norm)
    )
  );

  const slugTeamRows = slugs.length
    ? await db
        .select({
          slug: schools.slug,
          teamId: teams.id,
          teamActive: teams.active,
        })
        .from(schools)
        .innerJoin(teams, eq(teams.schoolId, schools.id))
        .where(
          and(
            inArray(schools.slug, slugs),
            eq(teams.ageGroup, "U13"),
            eq(teams.isFirstTeam, true)
          )
        )
    : [];

  const slugToTeamId = new Map<string, string>();
  for (const r of slugTeamRows) {
    if (!slugToTeamId.has(r.slug) || r.teamActive) slugToTeamId.set(r.slug, r.teamId);
  }

  const nameTeamRows = officialNames.length
    ? await db
        .select({
          officialName: schools.officialName,
          slug: schools.slug,
          teamId: teams.id,
          teamActive: teams.active,
        })
        .from(schools)
        .innerJoin(teams, eq(teams.schoolId, schools.id))
        .where(
          and(
            or(
              ...officialNames.map(
                (n) => sql`lower(${schools.officialName}) = ${n}`
              )
            ),
            eq(teams.ageGroup, "U13"),
            eq(teams.isFirstTeam, true)
          )
        )
    : [];

  // Map normalized official_name -> possible team ids (track ambiguity).
  const nameToTeams = new Map<string, Array<{ teamId: string; teamActive: boolean; slug: string }>>();
  for (const r of nameTeamRows) {
    const key = norm(r.officialName);
    const list = nameToTeams.get(key) ?? [];
    list.push({ teamId: r.teamId, teamActive: r.teamActive, slug: r.slug });
    nameToTeams.set(key, list);
  }

  function resolveTeamIdForSide(input: {
    officialName: string;
    slug: string;
    label: "home" | "away";
    rowNumber: number;
  }): string | null {
    const name = input.officialName.trim();
    const slug = input.slug.trim();

    if (name.length) {
      const key = norm(name);
      const matches = nameToTeams.get(key) ?? [];
      if (matches.length === 0) {
        errors.push({
          rowNumber: input.rowNumber,
          error: `Unknown ${input.label}_school_official_name: ${name}`,
        });
        return null;
      }
      // If multiple schools share the same official name, force explicit slug.
      const uniqueTeamIds = Array.from(new Set(matches.map((m) => m.teamId)));
      if (uniqueTeamIds.length !== 1) {
        const slugs = Array.from(new Set(matches.map((m) => m.slug))).sort();
        errors.push({
          rowNumber: input.rowNumber,
          error: `Ambiguous ${input.label}_school_official_name: ${name} (matches: ${slugs.join(
            ", "
          )}). Use *_school_slug instead.`,
        });
        return null;
      }
      // Prefer active if duplicates (same team id shouldn’t happen, but keep rule consistent)
      const active = matches.find((m) => m.teamActive)?.teamId;
      return active ?? uniqueTeamIds[0]!;
    }

    if (slug.length) {
      const id = slugToTeamId.get(slug);
      if (!id) {
        errors.push({
          rowNumber: input.rowNumber,
          error: `Unknown ${input.label}_school_slug: ${slug}`,
        });
        return null;
      }
      return id;
    }

    errors.push({
      rowNumber: input.rowNumber,
      error: `Missing ${input.label} school identifier (provide ${input.label}_school_official_name or ${input.label}_school_slug).`,
    });
    return null;
  }

  for (const r of okRows) {
    const homeTeamId = resolveTeamIdForSide({
      officialName: r.home_school_official_name,
      slug: r.home_school_slug,
      label: "home",
      rowNumber: r.rowNumber,
    });
    const awayTeamId = resolveTeamIdForSide({
      officialName: r.away_school_official_name,
      slug: r.away_school_slug,
      label: "away",
      rowNumber: r.rowNumber,
    });
    if (!homeTeamId || !awayTeamId) continue;
    if (homeTeamId === awayTeamId) {
      errors.push({ rowNumber: r.rowNumber, error: "Home and away resolve to the same team." });
      continue;
    }
    resolved.push({ ...r, homeTeamId, awayTeamId });
  }

  const inserted: ImportOkRow[] = [];

  await db.transaction(async (tx) => {
    for (const r of resolved) {
      const homeTeamId = r.homeTeamId;
      const awayTeamId = r.awayTeamId;

      // Match an existing fixture if it exists (prevents accidental duplicates).
      const [existingFixture] = await tx
        .select({ id: fixtures.id })
        .from(fixtures)
        .where(
          and(
            eq(fixtures.matchDate, r.match_date),
            eq(fixtures.homeTeamId, homeTeamId),
            eq(fixtures.awayTeamId, awayTeamId)
          )
        )
        .limit(1);

      let fixtureId = existingFixture?.id;
      let action: ImportOkRow["action"] = "created";

      if (!fixtureId) {
        const [ins] = await tx
          .insert(fixtures)
          .values({
            matchDate: r.match_date,
            homeTeamId,
            awayTeamId,
            venue: r.venue?.trim() || null,
            seasonId: r.season_id?.trim() || null,
            competitionId: r.competition_id?.trim() || null,
            status: "PLAYED",
          })
          .returning({ id: fixtures.id });
        fixtureId = ins.id;
      } else {
        action = "attached_to_existing_fixture";
      }

      // Ensure we don't create a second result for the same fixture.
      const [existingResult] = await tx
        .select({ id: results.id })
        .from(results)
        .where(eq(results.fixtureId, fixtureId))
        .limit(1);

      if (existingResult?.id) {
        errors.push({
          rowNumber: r.rowNumber,
          error: `A result already exists for this fixture (${fixtureId}).`,
        });
        continue;
      }

      const now = new Date();
      const verificationLevel =
        r.verification_level ??
        (r.is_verified ? ("MODERATOR_VERIFIED" as const) : ("SUBMITTED" as const));

      const [resIns] = await tx
        .insert(results)
        .values({
          fixtureId,
          homeScore: r.home_score,
          awayScore: r.away_score,
          isVerified: r.is_verified,
          verificationLevel,
          publishedAt: r.is_verified ? now : null,
          updatedAt: now,
        })
        .returning({ id: results.id });

      inserted.push({
        rowNumber: r.rowNumber,
        fixtureId,
        resultId: resIns.id,
        action,
      });
    }
  });

  return NextResponse.json({
    ok: true as const,
    inserted,
    errors,
    counts: {
      inserted: inserted.length,
      errors: errors.length,
      parsed: rawRows.length,
    },
  });
}

