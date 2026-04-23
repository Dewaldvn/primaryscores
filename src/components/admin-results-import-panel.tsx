"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ImportResponse =
  | {
      ok: true;
      inserted: Array<{
        rowNumber: number;
        fixtureId: string;
        resultId: string;
        action: "created" | "attached_to_existing_fixture";
      }>;
      errors: Array<{ rowNumber: number; error: string }>;
      counts: { inserted: number; errors: number; parsed: number };
    }
  | { ok: false; error?: string; errors?: Array<{ rowNumber: number; error: string }> };

export function AdminResultsImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [resp, setResp] = useState<ImportResponse | null>(null);
  const [pending, start] = useTransition();

  const summary = useMemo(() => {
    if (!resp || !resp.ok) return null;
    return `${resp.counts.inserted} inserted · ${resp.counts.errors} error(s) · ${resp.counts.parsed} parsed`;
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

      const r = await fetch("/api/admin/import/results", { method: "POST", body: fd });
      const data = (await r.json()) as ImportResponse;
      setResp(data);

      if (!data.ok) {
        toast.error(data.error ?? "Import failed. Check errors below.");
        return;
      }

      if (data.counts.errors > 0) {
        toast.message("Import completed with some errors. See details below.");
      } else {
        toast.success("Import completed.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1 text-sm">
        <p className="text-muted-foreground">
          1) Download a template above, 2) fill it in, 3) upload it here. You can identify schools by
          <span className="font-medium text-foreground"> official_name</span> (preferred) or by
          <span className="font-medium text-foreground"> slug</span>.
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium" htmlFor="results-import-file">
            Upload and Import
          </label>
          <Input
            id="results-import-file"
            type="file"
            accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            disabled={pending}
          />
        </div>
        <Button type="button" onClick={upload} disabled={pending || !file}>
          {pending ? "Importing…" : "Upload and Import"}
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
            <p className="mt-2 text-xs text-muted-foreground">
              Showing first 50 errors.
            </p>
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
            <p className="mt-2 text-xs text-muted-foreground">
              Showing first 50 errors.
            </p>
          ) : null}
        </div>
      ) : null}

      {resp && resp.ok && resp.inserted.length ? (
        <div className="rounded-lg border p-3 text-sm">
          <p className="font-medium">Inserted</p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            {resp.inserted.slice(0, 25).map((r) => (
              <li key={r.resultId}>
                <span className="font-mono text-xs">row {r.rowNumber}</span>: {r.action} ·{" "}
                <span className="font-mono text-xs">{r.fixtureId}</span>
              </li>
            ))}
          </ul>
          {resp.inserted.length > 25 ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Showing first 25 inserted rows.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

