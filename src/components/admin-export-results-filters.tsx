"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCHOOL_SPORTS, schoolSportLabel, type SchoolSport } from "@/lib/sports";
import { LinkButton } from "@/components/link-button";
import { SchoolLogo } from "@/components/school-logo";
type SchoolHit = {
  id: string;
  displayName: string;
  provinceName: string;
  town: string | null;
  logoPath: string | null;
};

function buildExportPath(
  format: "csv" | "xlsx",
  state: { q: string; teamId: string; schoolId: string; sport: string; dateFrom: string; dateTo: string }
) {
  const u = new URLSearchParams();
  u.set("format", format);
  if (state.q.trim()) u.set("q", state.q.trim());
  if (state.teamId.trim()) u.set("teamId", state.teamId.trim());
  if (state.schoolId.trim()) u.set("schoolId", state.schoolId.trim());
  if (state.sport) u.set("sport", state.sport);
  if (state.dateFrom.trim()) u.set("dateFrom", state.dateFrom.trim());
  if (state.dateTo.trim()) u.set("dateTo", state.dateTo.trim());
  return `/api/admin/export/results?${u.toString()}`;
}

export function AdminExportResultsFilters() {
  const [q, setQ] = useState("");
  const [teamId, setTeamId] = useState("");
  const [schoolQ, setSchoolQ] = useState("");
  const [schoolId, setSchoolId] = useState("");
  const [schoolHits, setSchoolHits] = useState<SchoolHit[]>([]);
  const [sport, setSport] = useState<"" | SchoolSport>("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const schoolAbort = useRef<AbortController | null>(null);

  async function searchSchools(next: string) {
    setSchoolQ(next);
    setSchoolId("");
    const t = next.trim();
    if (t.length < 2) {
      setSchoolHits([]);
      return;
    }
    schoolAbort.current?.abort();
    const ac = new AbortController();
    schoolAbort.current = ac;
    try {
      const res = await fetch(`/api/schools/search?q=${encodeURIComponent(t)}`, {
        cache: "no-store",
        signal: ac.signal,
      });
      const data = (await res.json()) as SchoolHit[];
      setSchoolHits(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }

  const state = useMemo(
    () => ({ q, teamId, schoolId, sport, dateFrom, dateTo }),
    [q, teamId, schoolId, sport, dateFrom, dateTo]
  );

  const csvHref = useMemo(() => buildExportPath("csv", state), [state]);
  const xlsxHref = useMemo(() => buildExportPath("xlsx", state), [state]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Filter by search text (schools, competitions), team UUID, school UUID, sport, and/or match date range.
        Exports up to 20&nbsp;000 rows, newest first.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="space-y-1">
          <Label htmlFor="ex-q">Search</Label>
          <Input id="ex-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="School / competition…" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ex-team">Team ID (UUID)</Label>
          <Input id="ex-team" value={teamId} onChange={(e) => setTeamId(e.target.value)} placeholder="Optional" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ex-school-search">School search (optional)</Label>
          <Input
            id="ex-school-search"
            value={schoolQ}
            onChange={(e) => void searchSchools(e.target.value)}
            placeholder="Type to search schools…"
            autoComplete="off"
          />
          {schoolHits.length > 0 ? (
            <ul className="max-h-40 overflow-auto rounded border bg-popover text-sm shadow-md">
              {schoolHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      setSchoolId(h.id);
                      setSchoolQ(h.displayName);
                      setSchoolHits([]);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <SchoolLogo logoPath={h.logoPath} alt="" size="xs" />
                      {h.displayName}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {h.town} · {h.provinceName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="space-y-1">
          <Label htmlFor="ex-sport">Sport</Label>
          <select
            id="ex-sport"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={sport}
            onChange={(e) => setSport((e.target.value || "") as "" | SchoolSport)}
          >
            <option value="">Any</option>
            {SCHOOL_SPORTS.map((s) => (
              <option key={s} value={s}>
                {schoolSportLabel(s)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="ex-df">Match date from</Label>
          <Input id="ex-df" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="ex-dt">Match date to</Label>
          <Input id="ex-dt" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        <LinkButton variant="outline" size="sm" href={csvHref}>
          Download CSV
        </LinkButton>
        <LinkButton variant="outline" size="sm" href={xlsxHref}>
          Download Excel
        </LinkButton>
      </div>
    </div>
  );
}
