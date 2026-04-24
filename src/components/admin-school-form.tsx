"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertSchoolAction } from "@/actions/admin-crud";
import { DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE } from "@/lib/school-default-teams";
import { SCHOOL_SPORTS, schoolSportLabel, type SchoolSport } from "@/lib/sports";

type SchoolType = "PRIMARY" | "SECONDARY" | "COMBINED";

export function AdminSchoolForm({
  provinces,
  initial,
  prefillNew,
  schoolAdminMode = false,
}: {
  provinces: { id: string; name: string }[];
  schoolAdminMode?: boolean;
  initial?: {
    id: string;
    officialName: string;
    displayName: string;
    nickname: string | null;
    slug: string;
    schoolType: "PRIMARY" | "SECONDARY" | "COMBINED";
    existingDefaultTeamCodes?: string[];
    existingSports?: SchoolSport[];
    existingDefaultTeamsBySport?: Partial<Record<SchoolSport, string[]>>;
    provinceId: string;
    town: string | null;
    website: string | null;
    active: boolean;
  };
  /** When creating a school (no `initial`), default form fields from moderation deep-links etc. */
  prefillNew?: { displayName?: string; officialName?: string };
}) {
  const router = useRouter();
  const defaultCodesForType = DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[initial?.schoolType ?? "PRIMARY"];
  const initialSelectedSports: SchoolSport[] = initial ? [] : [...SCHOOL_SPORTS];
  const initialSelectedCodes: string[] = initial ? [] : [...defaultCodesForType];
  const [pending, setPending] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [blockedTeamsHint, setBlockedTeamsHint] = useState<{
    schoolId: string;
    items: Array<{ sport: string; ageGroup: string; teamLabel: string; fixtureCount: number }>;
  } | null>(null);
  const [schoolType, setSchoolType] = useState<SchoolType>(initial?.schoolType ?? "PRIMARY");
  const [selectedDefaultTeamCodes, setSelectedDefaultTeamCodes] = useState<Set<string>>(
    new Set(initialSelectedCodes)
  );
  const [selectedDefaultTeamSports, setSelectedDefaultTeamSports] = useState<Set<SchoolSport>>(
    new Set(initialSelectedSports)
  );
  const existingTeamCodes = initial?.existingDefaultTeamCodes ?? [];

  function setSchoolTypeAndResetDefaults(nextType: SchoolType) {
    setSchoolType(nextType);
    if (initial) {
      setSelectedDefaultTeamSports(new Set());
      setSelectedDefaultTeamCodes(new Set());
      return;
    }
    setSelectedDefaultTeamSports(new Set(SCHOOL_SPORTS));
    setSelectedDefaultTeamCodes(new Set(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[nextType]));
  }

  function toggleDefaultTeamCode(code: string, checked: boolean) {
    setSelectedDefaultTeamCodes((prev) => {
      const next = new Set(prev);
      if (checked) next.add(code);
      else next.delete(code);
      return next;
    });
  }

  function toggleDefaultTeamSport(sport: SchoolSport, checked: boolean) {
    setSelectedDefaultTeamSports((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sport);
      else next.delete(sport);
      return next;
    });
  }

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        setFormFeedback(null);
        setBlockedTeamsHint(null);
        void upsertSchoolAction({
          id: initial?.id,
          officialName: fd.get("officialName"),
          displayName: fd.get("displayName"),
          nickname: fd.get("nickname") || null,
          slug: fd.get("slug") || undefined,
          schoolType: fd.get("schoolType"),
          defaultTeamCodes: Array.from(selectedDefaultTeamCodes),
          defaultTeamSports: Array.from(selectedDefaultTeamSports),
          provinceId: fd.get("provinceId"),
          town: fd.get("town") || null,
          website: fd.get("website") || null,
          active: fd.get("active") === "on",
        }).then((res) => {
          setPending(false);
          if (!res.ok) {
            const msg = "error" in res && res.error ? res.error : "Update failed. Please check your inputs and try again.";
            setFormFeedback({ kind: "error", text: msg });
            toast.error(msg);
            if (
              "blockedTeams" in res &&
              Array.isArray(res.blockedTeams) &&
              res.blockedTeams.length > 0
            ) {
              setBlockedTeamsHint({
                schoolId:
                  "schoolId" in res && typeof res.schoolId === "string" ? res.schoolId : (initial?.id ?? ""),
                items: res.blockedTeams,
              });
            }
            return;
          }
          const msg = initial ? "Update successful" : "School created successfully";
          setFormFeedback({ kind: "ok", text: msg });
          toast.success(msg);
          if (!initial) {
            (e.target as HTMLFormElement).reset();
            setSchoolType("PRIMARY");
            setSelectedDefaultTeamCodes(new Set(DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE.PRIMARY));
          } else {
            if (schoolAdminMode) {
              router.refresh();
            } else {
              router.push("/admin/schools");
              router.refresh();
            }
          }
        });
      }}
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      {schoolAdminMode && initial ? (
        <>
          <input type="hidden" name="slug" value={initial.slug} />
          <input type="hidden" name="active" value={initial.active ? "on" : ""} />
          <input type="hidden" name="schoolType" value={initial.schoolType} />
        </>
      ) : null}
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="displayName">Display name (listings & search)</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          defaultValue={initial?.displayName ?? prefillNew?.displayName}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="nickname">Short nickname (optional)</Label>
        <Input
          id="nickname"
          name="nickname"
          placeholder="e.g. PBHS"
          defaultValue={initial?.nickname ?? ""}
        />
        <p className="text-xs text-muted-foreground">Very short label for tight UI; leave blank if not needed.</p>
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="officialName">Official name</Label>
        <Input
          id="officialName"
          name="officialName"
          required
          defaultValue={initial?.officialName ?? prefillNew?.officialName ?? prefillNew?.displayName}
        />
      </div>
      {!schoolAdminMode ? (
        <div className="space-y-2 sm:col-span-2">
          <Label>School type</Label>
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="schoolType"
                value="PRIMARY"
                checked={schoolType === "PRIMARY"}
                onChange={() => setSchoolTypeAndResetDefaults("PRIMARY")}
              />
              Primary School
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="schoolType"
                value="SECONDARY"
                checked={schoolType === "SECONDARY"}
                onChange={() => setSchoolTypeAndResetDefaults("SECONDARY")}
              />
              Secondary School
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="schoolType"
                value="COMBINED"
                checked={schoolType === "COMBINED"}
                onChange={() => setSchoolTypeAndResetDefaults("COMBINED")}
              />
              Combined School
            </label>
          </div>
        </div>
      ) : null}
      {!schoolAdminMode ? (
        <div className="space-y-2 rounded-md border p-3 sm:col-span-2">
          <Label>{initial ? "Default teams (quick add)" : "Default teams to create"}</Label>
          <p className="text-xs text-muted-foreground">
            {initial
              ? ""
              : `These defaults are selected for a ${schoolType.toLowerCase()} school. Deselect any teams you do not want.`}
          </p>
          {initial ? (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Already linked to this school</Label>
              {initial.existingDefaultTeamsBySport && Object.keys(initial.existingDefaultTeamsBySport).length > 0 ? (
                <div className="space-y-1 text-sm">
                  {SCHOOL_SPORTS.map((sport) => {
                    const codes = initial.existingDefaultTeamsBySport?.[sport] ?? [];
                    if (codes.length === 0) return null;
                    return (
                      <p key={sport}>
                        <span className="font-medium">{schoolSportLabel(sport)}:</span> {codes.join(", ")}
                      </p>
                    );
                  })}
                </div>
              ) : existingTeamCodes.length > 0 ? (
                <p className="text-sm">{existingTeamCodes.join(", ")}</p>
              ) : (
                <p className="text-sm text-muted-foreground">No teams linked yet.</p>
              )}
            </div>
          ) : null}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Sports to create defaults for</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              {SCHOOL_SPORTS.map((sport) => (
                <label key={sport} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedDefaultTeamSports.has(sport)}
                    onChange={(e) => toggleDefaultTeamSport(sport, e.currentTarget.checked)}
                  />
                  {schoolSportLabel(sport)}
                </label>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Team age-groups/sides</Label>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {DEFAULT_TEAM_CODES_BY_SCHOOL_TYPE[schoolType].map((code) => (
              <label key={code} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDefaultTeamCodes.has(code)}
                  onChange={(e) => toggleDefaultTeamCode(code, e.currentTarget.checked)}
                />
                {code}
              </label>
            ))}
          </div>
        </div>
      ) : null}
      {!schoolAdminMode ? (
        <div className="space-y-1">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" name="slug" placeholder="auto from display name" defaultValue={initial?.slug} />
        </div>
      ) : null}
      <div className="space-y-1">
        <Label>Province</Label>
        <select
          name="provinceId"
          required
          defaultValue={initial?.provinceId}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
        >
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="town">Town</Label>
        <Input id="town" name="town" defaultValue={initial?.town ?? ""} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" type="url" defaultValue={initial?.website ?? ""} />
      </div>
      {!schoolAdminMode ? (
        <div className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="active" id="active" defaultChecked={initial?.active ?? true} />
          <Label htmlFor="active">Active</Label>
        </div>
      ) : null}
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {initial ? "Update school" : "Create school"}
      </Button>
      {formFeedback ? (
        <div className="sm:col-span-2 space-y-2 text-center">
          <p className={`text-sm ${formFeedback.kind === "ok" ? "text-emerald-700" : "text-destructive"}`}>
            {formFeedback.text}
          </p>
          {blockedTeamsHint ? (
            <div className="rounded-md border border-destructive/25 bg-destructive/5 p-3 text-left text-xs">
              <p className="font-medium text-destructive">Blocked teams linked to fixtures:</p>
              <ul className="mt-1 space-y-1 text-destructive">
                {blockedTeamsHint.items.map((t) => (
                  <li key={`${t.sport}-${t.ageGroup}-${t.teamLabel}`}>
                    {t.sport} {t.ageGroup}
                    {t.teamLabel} ({t.fixtureCount})
                  </li>
                ))}
              </ul>
              <a
                href={`/admin/teams?schoolId=${blockedTeamsHint.schoolId}`}
                className="mt-2 inline-block text-sm text-primary underline"
              >
                Open this school in Teams directory
              </a>
            </div>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
