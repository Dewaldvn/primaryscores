"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ImportResponse =
  | {
      ok: true;
      inserted: Array<{
        rowNumber: number;
        schoolId: string;
        slug: string;
        action: "created" | "updated";
        logoImported: boolean;
      }>;
      errors: Array<{ rowNumber: number; error: string }>;
      warnings: Array<{ rowNumber: number; warning: string }>;
      counts: { inserted: number; errors: number; warnings: number; parsed: number };
    }
  | {
      ok: false;
      error?: string;
      errors?: Array<{ rowNumber: number; error: string }>;
    };

export function AdminSchoolsImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState<"csv" | "xlsx">("csv");
  const [resp, setResp] = useState<ImportResponse | null>(null);
  const [pending, start] = useTransition();

  const templateHref = `/api/admin/import/schools-template?format=${format}`;

  const summary = useMemo(() => {
    if (!resp || !resp.ok) return null;
    return `${resp.counts.inserted} inserted/updated · ${resp.counts.errors} error(s) · ${resp.counts.warnings} warning(s) · ${resp.counts.parsed} parsed`;
  }, [resp]);

  function upload() {
    if (!file) {
      toast.error("Choose a CSV file first.");
      return;
    }
    start(async () => {
      setResp(null);
      const fd = new FormData();
      fd.set("file", file);

      const r = await fetch("/api/admin/import/schools", { method: "POST", body: fd });
      const data = (await r.json()) as ImportResponse;
      setResp(data);

      if (!data.ok) {
        toast.error(data.error ?? "Import failed. Check errors below.");
        return;
      }

      if (data.counts.errors > 0) {
        toast.message("Import completed with some errors. See details below.");
      } else if (data.counts.warnings > 0) {
        toast.message("Import completed with warnings.");
      } else {
        toast.success("Import completed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">
          The template includes all school capture fields used in Admin: official name, display name, nickname, slug,
          province, town, website, active status, and optional logo import URL.
        </p>
        <p className="text-muted-foreground">
          For logos in bulk, provide <span className="font-medium text-foreground">logo_url</span> (public image URL).
          If omitted, you can still upload logos per school later.
        </p>
        <a
          href={templateHref}
          className="inline-flex text-primary underline-offset-4 hover:underline"
        >
          Download schools import template
        </a>
      </div>

      <div className="max-w-xs space-y-1">
        <Label htmlFor="schools-import-format">Template and file format</Label>
        <select
          id="schools-import-format"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          value={format}
          onChange={(e) => setFormat((e.target.value as "csv" | "xlsx") || "csv")}
          disabled={pending}
        >
          <option value="csv">CSV (.csv)</option>
          <option value="xlsx">Excel (.xlsx)</option>
        </select>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium" htmlFor="schools-import-file">
            CSV file
          </label>
          <Input
            id="schools-import-file"
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={pending}
          />
        </div>
        <Button type="button" onClick={upload} disabled={pending || !file}>
          {pending ? "Importing..." : "Upload & import"}
        </Button>
      </div>

      {summary ? <p className="text-sm text-muted-foreground">{summary}</p> : null}

      {resp && !resp.ok && resp.errors?.length ? (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">Row errors</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {resp.errors.slice(0, 50).map((e) => (
              <li key={`${e.rowNumber}-${e.error}`}>
                <span className="font-mono text-xs">row {e.rowNumber}</span>: {e.error}
              </li>
            ))}
          </ul>
          {resp.errors.length > 50 ? (
            <p className="mt-2 text-xs text-muted-foreground">Showing first 50 errors.</p>
          ) : null}
        </div>
      ) : null}

      {resp && resp.ok && resp.errors.length ? (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">Row errors</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {resp.errors.slice(0, 50).map((e) => (
              <li key={`${e.rowNumber}-${e.error}`}>
                <span className="font-mono text-xs">row {e.rowNumber}</span>: {e.error}
              </li>
            ))}
          </ul>
          {resp.errors.length > 50 ? (
            <p className="mt-2 text-xs text-muted-foreground">Showing first 50 errors.</p>
          ) : null}
        </div>
      ) : null}

      {resp && resp.ok && resp.warnings.length ? (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">Warnings</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {resp.warnings.slice(0, 50).map((w) => (
              <li key={`${w.rowNumber}-${w.warning}`}>
                <span className="font-mono text-xs">row {w.rowNumber}</span>: {w.warning}
              </li>
            ))}
          </ul>
          {resp.warnings.length > 50 ? (
            <p className="mt-2 text-xs text-muted-foreground">Showing first 50 warnings.</p>
          ) : null}
        </div>
      ) : null}

      {resp && resp.ok && resp.inserted.length ? (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">Inserted / updated</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {resp.inserted.slice(0, 25).map((r) => (
              <li key={`${r.rowNumber}-${r.schoolId}-${r.slug}`}>
                <span className="font-mono text-xs">row {r.rowNumber}</span>: {r.action} ·{" "}
                <span className="font-mono text-xs">{r.slug}</span>
                {r.logoImported ? " · logo imported" : ""}
              </li>
            ))}
          </ul>
          {resp.inserted.length > 25 ? (
            <p className="mt-2 text-xs text-muted-foreground">Showing first 25 rows.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
