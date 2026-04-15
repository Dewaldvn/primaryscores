import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { provinces, schools, teams } from "@/db/schema";
import { slugify } from "@/lib/slug";
import { schoolsHasNicknameColumn } from "@/lib/school-db-support";
import { SCHOOL_LOGOS_BUCKET } from "@/lib/school-logo";
import { parseUploadedTable } from "@/lib/tabular";

const csvRowSchema = z.object({
  official_name: z.string().trim().min(2, "official_name is required"),
  display_name: z.string().trim().optional().default(""),
  nickname: z.string().trim().optional().default(""),
  slug: z.string().trim().optional().default(""),
  province_code: z.string().trim().optional().default(""),
  province_name: z.string().trim().optional().default(""),
  province_id: z.string().trim().optional().default(""),
  town: z.string().trim().optional().default(""),
  website: z.preprocess(
    (v) => (v == null || String(v).trim() === "" ? undefined : String(v).trim()),
    z.string().url().optional()
  ),
  active: z
    .union([z.string(), z.boolean()])
    .optional()
    .default("true")
    .transform((v) => {
      if (typeof v === "boolean") return v;
      const s = v.trim().toLowerCase();
      return s === "true" || s === "1" || s === "yes" || s === "y";
    }),
  logo_url: z.preprocess(
    (v) => (v == null || String(v).trim() === "" ? undefined : String(v).trim()),
    z.string().url().optional()
  ),
});

type ImportErrRow = {
  rowNumber: number;
  error: string;
};

type ImportWarningRow = {
  rowNumber: number;
  warning: string;
};

type ImportOkRow = {
  rowNumber: number;
  schoolId: string;
  slug: string;
  action: "created" | "updated";
  logoImported: boolean;
};

function serviceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  return { url, key };
}

function extFromContentType(contentType: string | null): string {
  const ct = contentType?.toLowerCase() ?? "";
  if (ct.includes("png")) return "png";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("svg")) return "svg";
  return "png";
}

async function uploadLogoFromUrl(params: {
  schoolId: string;
  logoUrl: string;
}): Promise<{ ok: true; logoPath: string } | { ok: false; error: string }> {
  const supabase = serviceSupabase();
  if (!supabase) {
    return { ok: false, error: "SUPABASE_SERVICE_ROLE_KEY is not configured." };
  }

  let logoResponse: Response;
  try {
    logoResponse = await fetch(params.logoUrl, { cache: "no-store" });
  } catch {
    return { ok: false, error: "Could not fetch logo_url." };
  }
  if (!logoResponse.ok) {
    return { ok: false, error: `Logo download failed (${logoResponse.status}).` };
  }

  const contentType = logoResponse.headers.get("content-type");
  if (!contentType?.toLowerCase().startsWith("image/")) {
    return { ok: false, error: "logo_url did not return an image content-type." };
  }

  const arr = Buffer.from(await logoResponse.arrayBuffer());
  if (arr.byteLength === 0) {
    return { ok: false, error: "Downloaded logo was empty." };
  }
  if (arr.byteLength > 2 * 1024 * 1024) {
    return { ok: false, error: "Downloaded logo is larger than 2 MB." };
  }

  const ext = extFromContentType(contentType);
  const hash = createHash("sha1").update(params.logoUrl).digest("hex").slice(0, 8);
  const objectPath = `${params.schoolId}/logo-${hash}.${ext}`;

  const put = await fetch(
    `${supabase.url}/storage/v1/object/${SCHOOL_LOGOS_BUCKET}/${encodeURIComponent(objectPath)}`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${supabase.key}`,
        apikey: supabase.key,
        "content-type": contentType,
        "x-upsert": "true",
      },
      body: arr,
    }
  );

  if (!put.ok) {
    return { ok: false, error: `Storage upload failed (${put.status}).` };
  }

  return { ok: true, logoPath: objectPath };
}

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

  const errors: ImportErrRow[] = [];
  const warnings: ImportWarningRow[] = [];
  const validatedRows: Array<z.infer<typeof csvRowSchema> & { rowNumber: number }> = [];

  for (let i = 0; i < rawRows.length; i++) {
    const rowNumber = i + 2;
    const res = csvRowSchema.safeParse(rawRows[i]);
    if (!res.success) {
      errors.push({
        rowNumber,
        error: res.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; "),
      });
      continue;
    }
    validatedRows.push({ ...res.data, rowNumber });
  }

  if (validatedRows.length === 0) {
    return NextResponse.json({ ok: false, errors }, { status: 400 });
  }

  const includeNick = await schoolsHasNicknameColumn();

  const provinceRows = await db.select({ id: provinces.id, code: provinces.code, name: provinces.name }).from(provinces);
  const provinceById = new Map(provinceRows.map((p) => [p.id, p]));
  const provinceByCode = new Map(provinceRows.map((p) => [p.code.trim().toLowerCase(), p]));
  const provinceByName = new Map(provinceRows.map((p) => [p.name.trim().toLowerCase(), p]));

  const seenImportSlugs = new Set<string>();
  type Prepared = z.infer<typeof csvRowSchema> & {
    rowNumber: number;
    resolvedProvinceId: string;
    resolvedSlug: string;
  };
  const preparedRows: Prepared[] = [];

  for (const row of validatedRows) {
    const displayName = row.display_name.trim() || row.official_name.trim();
    const desiredSlug = row.slug.trim() || slugify(displayName);
    const resolvedSlug = slugify(desiredSlug);
    if (!resolvedSlug) {
      errors.push({ rowNumber: row.rowNumber, error: "Could not derive a slug for this row." });
      continue;
    }
    if (seenImportSlugs.has(resolvedSlug)) {
      errors.push({
        rowNumber: row.rowNumber,
        error: `Duplicate slug in import file: ${resolvedSlug}. Keep one row per school slug.`,
      });
      continue;
    }
    seenImportSlugs.add(resolvedSlug);

    const provinceIdFromInput = row.province_id.trim();
    const provinceCodeFromInput = row.province_code.trim().toLowerCase();
    const provinceNameFromInput = row.province_name.trim().toLowerCase();

    let resolvedProvinceId: string | null = null;
    if (provinceIdFromInput) {
      if (!/^[0-9a-f-]{36}$/i.test(provinceIdFromInput) || !provinceById.has(provinceIdFromInput)) {
        errors.push({ rowNumber: row.rowNumber, error: `Unknown province_id: ${provinceIdFromInput}` });
        continue;
      }
      resolvedProvinceId = provinceIdFromInput;
    } else if (provinceCodeFromInput) {
      resolvedProvinceId = provinceByCode.get(provinceCodeFromInput)?.id ?? null;
      if (!resolvedProvinceId) {
        errors.push({ rowNumber: row.rowNumber, error: `Unknown province_code: ${row.province_code}` });
        continue;
      }
    } else if (provinceNameFromInput) {
      resolvedProvinceId = provinceByName.get(provinceNameFromInput)?.id ?? null;
      if (!resolvedProvinceId) {
        errors.push({ rowNumber: row.rowNumber, error: `Unknown province_name: ${row.province_name}` });
        continue;
      }
    } else {
      errors.push({
        rowNumber: row.rowNumber,
        error: "Missing province identifier. Provide one of province_id, province_code, or province_name.",
      });
      continue;
    }

    preparedRows.push({
      ...row,
      display_name: displayName,
      resolvedSlug,
      resolvedProvinceId,
    });
  }

  if (preparedRows.length === 0) {
    return NextResponse.json({
      ok: true as const,
      inserted: [],
      errors,
      warnings,
      counts: { inserted: 0, errors: errors.length, warnings: warnings.length, parsed: rawRows.length },
    });
  }

  const existing = await db
    .select({ id: schools.id, slug: schools.slug })
    .from(schools)
    .where(inArray(schools.slug, preparedRows.map((r) => r.resolvedSlug)));
  const existingBySlug = new Map(existing.map((r) => [r.slug, r]));

  const inserted: ImportOkRow[] = [];
  const pendingLogoImports: Array<{ rowNumber: number; schoolId: string; logoUrl: string }> = [];

  await db.transaction(async (tx) => {
    for (const row of preparedRows) {
      const now = new Date();
      const existingSchool = existingBySlug.get(row.resolvedSlug);
      const values = {
        officialName: row.official_name.trim(),
        displayName: row.display_name.trim(),
        ...(includeNick ? { nickname: row.nickname.trim() || null } : {}),
        slug: row.resolvedSlug,
        provinceId: row.resolvedProvinceId,
        town: row.town.trim() || null,
        website: row.website ?? null,
        active: row.active,
        updatedAt: now,
      };

      let schoolId: string;
      let action: ImportOkRow["action"];

      if (existingSchool) {
        schoolId = existingSchool.id;
        action = "updated";
        await tx.update(schools).set(values).where(eq(schools.id, schoolId));
      } else {
        action = "created";
        const [created] = await tx
          .insert(schools)
          .values(values)
          .returning({ id: schools.id, slug: schools.slug });
        schoolId = created.id;
        existingBySlug.set(created.slug, { id: created.id, slug: created.slug });
      }

      // Keep admin import behavior consistent: every school should have a default active U13 first team.
      const [u13Team] = await tx
        .select({ id: teams.id })
        .from(teams)
        .where(and(eq(teams.schoolId, schoolId), eq(teams.ageGroup, "U13"), eq(teams.isFirstTeam, true)))
        .limit(1);
      if (!u13Team) {
        await tx.insert(teams).values({
          schoolId,
          ageGroup: "U13",
          teamLabel: "A",
          isFirstTeam: true,
          active: true,
        });
      }

      inserted.push({
        rowNumber: row.rowNumber,
        schoolId,
        slug: row.resolvedSlug,
        action,
        logoImported: false,
      });

      if (row.logo_url) {
        pendingLogoImports.push({
          rowNumber: row.rowNumber,
          schoolId,
          logoUrl: row.logo_url,
        });
      }
    }
  });

  for (const logoRow of pendingLogoImports) {
    const logoRes = await uploadLogoFromUrl({ schoolId: logoRow.schoolId, logoUrl: logoRow.logoUrl });
    if (!logoRes.ok) {
      warnings.push({
        rowNumber: logoRow.rowNumber,
        warning: `School imported but logo was not imported (${logoRes.error})`,
      });
      continue;
    }

    const now = new Date();
    await db
      .update(schools)
      .set({ logoPath: logoRes.logoPath, updatedAt: now })
      .where(eq(schools.id, logoRow.schoolId));

    const item = inserted.find((x) => x.rowNumber === logoRow.rowNumber && x.schoolId === logoRow.schoolId);
    if (item) item.logoImported = true;
  }

  return NextResponse.json({
    ok: true as const,
    inserted,
    errors,
    warnings,
    counts: {
      inserted: inserted.length,
      errors: errors.length,
      warnings: warnings.length,
      parsed: rawRows.length,
    },
  });
}
