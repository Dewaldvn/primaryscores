import * as XLSX from "xlsx";

export type TabularFormat = "csv" | "xlsx";

export function parseTabularFormat(value: string | null | undefined): TabularFormat {
  const v = (value ?? "").trim().toLowerCase();
  return v === "xlsx" ? "xlsx" : "csv";
}

export function csvCell(v: string | number | boolean | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(headers: string[], rows: Array<Record<string, unknown>>): string {
  const header = headers.join(",");
  const lines = rows.map((row) =>
    headers
      .map((h) => csvCell(row[h] as string | number | boolean | null | undefined))
      .join(",")
  );
  return `\uFEFF${[header, ...lines].join("\r\n")}`;
}

export function rowsToXlsxBuffer(
  headers: string[],
  rows: Array<Record<string, unknown>>,
  sheetName: string
): Buffer {
  const data = rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const h of headers) out[h] = row[h] ?? "";
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(data, { header: headers });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" }) as Buffer;
}

export async function parseUploadedTable(
  file: File
): Promise<{ ok: true; rows: Record<string, unknown>[] } | { ok: false; error: string }> {
  const lower = file.name.toLowerCase();
  const isXlsx = lower.endsWith(".xlsx");

  if (isXlsx) {
    try {
      const buf = Buffer.from(await file.arrayBuffer());
      const wb = XLSX.read(buf, { type: "buffer" });
      const first = wb.SheetNames[0];
      if (!first) return { ok: false, error: "Excel workbook has no sheets." };
      const ws = wb.Sheets[first];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
        defval: "",
        raw: false,
      });
      return { ok: true, rows };
    } catch {
      return { ok: false, error: "Could not parse Excel file." };
    }
  }

  const Papa = await import("papaparse");
  const text = await file.text();
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
  });
  if (parsed.errors?.length) {
    return { ok: false, error: `CSV parse error: ${parsed.errors[0]?.message ?? "unknown"}` };
  }
  return { ok: true, rows: parsed.data ?? [] };
}
