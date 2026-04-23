"use client";

import { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LinkButton } from "@/components/link-button";
import { SchoolLogo } from "@/components/school-logo";
import { cn } from "@/lib/utils";

type ProvinceRow = { id: string; name: string; code: string };

type SchoolHit = {
  id: string;
  displayName: string;
  provinceName: string;
  town: string | null;
  logoPath: string | null;
};

type TeamHit = {
  id: string;
  label: string;
  schoolLogoPath: string | null;
};

const pillClass =
  "inline-flex items-center gap-2 rounded-full border bg-background px-2.5 py-1 text-xs";

function buildExportPath(opts: {
  format: "csv" | "xlsx";
  schoolIds: string[];
  teamIds: string[];
  provinceIds: string[];
}) {
  const u = new URLSearchParams();
  u.set("format", opts.format);
  for (const id of opts.schoolIds) u.append("schoolId", id);
  for (const id of opts.teamIds) u.append("teamId", id);
  for (const id of opts.provinceIds) u.append("provinceId", id);
  return `/api/admin/export/schools?${u.toString()}`;
}

export function AdminExportSchoolsTeamsFilters({ provinces }: { provinces: ProvinceRow[] }) {
  const [schoolQ, setSchoolQ] = useState("");
  const [schoolHits, setSchoolHits] = useState<SchoolHit[]>([]);
  const [teamQ, setTeamQ] = useState("");
  const [teamHits, setTeamHits] = useState<TeamHit[]>([]);
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [selectedSchools, setSelectedSchools] = useState<Record<string, SchoolHit>>({});
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [selectedTeams, setSelectedTeams] = useState<Record<string, TeamHit>>({});
  const [selectedProvinceIds, setSelectedProvinceIds] = useState<string[]>([]);

  const schoolAbort = useRef<AbortController | null>(null);
  const teamAbort = useRef<AbortController | null>(null);

  async function searchSchools(q: string) {
    const t = q.trim();
    setSchoolQ(q);
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

  async function searchTeams(q: string) {
    const t = q.trim();
    setTeamQ(q);
    if (t.length < 2) {
      setTeamHits([]);
      return;
    }
    teamAbort.current?.abort();
    const ac = new AbortController();
    teamAbort.current = ac;
    try {
      const res = await fetch(`/api/teams/search?q=${encodeURIComponent(t)}`, {
        cache: "no-store",
        signal: ac.signal,
      });
      const data = (await res.json()) as TeamHit[];
      setTeamHits(Array.isArray(data) ? data : []);
    } catch {
      // ignore
    }
  }

  function addSchool(h: SchoolHit) {
    if (selectedSchoolIds.includes(h.id)) return;
    setSelectedSchoolIds((prev) => [...prev, h.id]);
    setSelectedSchools((prev) => ({ ...prev, [h.id]: h }));
    setSchoolHits([]);
    setSchoolQ("");
  }

  function removeSchool(id: string) {
    setSelectedSchoolIds((prev) => prev.filter((x) => x !== id));
    setSelectedSchools((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function addTeam(h: TeamHit) {
    if (selectedTeamIds.includes(h.id)) return;
    setSelectedTeamIds((prev) => [...prev, h.id]);
    setSelectedTeams((prev) => ({ ...prev, [h.id]: h }));
    setTeamHits([]);
    setTeamQ("");
  }

  function removeTeam(id: string) {
    setSelectedTeamIds((prev) => prev.filter((x) => x !== id));
    setSelectedTeams((prev) => {
      const copy = { ...prev };
      delete copy[id];
      return copy;
    });
  }

  function toggleProvince(id: string) {
    setSelectedProvinceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const csvHref = useMemo(
    () =>
      buildExportPath({
        format: "csv",
        schoolIds: selectedSchoolIds,
        teamIds: selectedTeamIds,
        provinceIds: selectedProvinceIds,
      }),
    [selectedSchoolIds, selectedTeamIds, selectedProvinceIds]
  );
  const xlsxHref = useMemo(
    () =>
      buildExportPath({
        format: "xlsx",
        schoolIds: selectedSchoolIds,
        teamIds: selectedTeamIds,
        provinceIds: selectedProvinceIds,
      }),
    [selectedSchoolIds, selectedTeamIds, selectedProvinceIds]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Search and add multiple schools and/or teams. You can also select provinces. Excel export includes teams in a
        separate sheet.
      </p>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="space-y-1.5 lg:col-span-1">
          <Label htmlFor="ex-schools">Schools search</Label>
          <Input
            id="ex-schools"
            value={schoolQ}
            onChange={(e) => void searchSchools(e.target.value)}
            placeholder="Type to search schools…"
            autoComplete="off"
          />
          {schoolHits.length > 0 ? (
            <ul className="max-h-44 overflow-auto rounded border bg-popover text-sm shadow-md">
              {schoolHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left hover:bg-muted"
                    onClick={() => addSchool(h)}
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

        <div className="space-y-1.5 lg:col-span-1">
          <Label htmlFor="ex-teams">Teams search</Label>
          <Input
            id="ex-teams"
            value={teamQ}
            onChange={(e) => void searchTeams(e.target.value)}
            placeholder="Type to search teams…"
            autoComplete="off"
          />
          {teamHits.length > 0 ? (
            <ul className="max-h-44 overflow-auto rounded border bg-popover text-sm shadow-md">
              {teamHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left hover:bg-muted"
                    onClick={() => addTeam(h)}
                  >
                    <span className="flex items-center gap-2">
                      <SchoolLogo logoPath={h.schoolLogoPath} alt="" size="xs" />
                      {h.label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="space-y-2 lg:col-span-1">
          <Label>Provinces</Label>
          <div className="max-h-44 space-y-1 overflow-auto rounded border bg-background p-2 text-sm">
            {provinces.map((p) => (
              <label key={p.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedProvinceIds.includes(p.id)}
                  onChange={() => toggleProvince(p.id)}
                />
                <span className="min-w-0 truncate">{p.name}</span>
                <span className="text-xs text-muted-foreground">({p.code})</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {selectedSchoolIds.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedSchoolIds.map((id) => (
              <span key={id} className={pillClass}>
                <SchoolLogo logoPath={selectedSchools[id]?.logoPath} alt="" size="xs" />
                <span className="max-w-[18rem] truncate">{selectedSchools[id]?.displayName ?? id}</span>
                <button
                  type="button"
                  className={cn("ml-1 rounded px-1 text-muted-foreground hover:text-foreground")}
                  onClick={() => removeSchool(id)}
                  aria-label="Remove school"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}

        {selectedTeamIds.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedTeamIds.map((id) => (
              <span key={id} className={pillClass}>
                <SchoolLogo logoPath={selectedTeams[id]?.schoolLogoPath} alt="" size="xs" />
                <span className="max-w-[22rem] truncate">{selectedTeams[id]?.label ?? id}</span>
                <button
                  type="button"
                  className={cn("ml-1 rounded px-1 text-muted-foreground hover:text-foreground")}
                  onClick={() => removeTeam(id)}
                  aria-label="Remove team"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <LinkButton variant="outline" size="sm" href={csvHref}>
          Export schools (CSV)
        </LinkButton>
        <LinkButton variant="outline" size="sm" href={xlsxHref}>
          Export schools + teams (Excel)
        </LinkButton>
      </div>
    </div>
  );
}

