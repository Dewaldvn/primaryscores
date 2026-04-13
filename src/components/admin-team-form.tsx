"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertTeamAction } from "@/actions/admin-crud";
import { SCHOOL_SPORTS, schoolSportLabel, type SchoolSport } from "@/lib/sports";
import { TEAM_GENDERS, teamGenderLabel, type TeamGender } from "@/lib/team-gender";

export type AdminTeamFormInitial = {
  id: string;
  schoolId: string;
  sport: SchoolSport;
  gender: TeamGender | null;
  ageGroup: string;
  teamLabel: string;
  teamNickname: string | null;
  active: boolean;
};

export function AdminTeamForm({
  schools,
  initial,
  lockSchoolSelect = false,
  fixedSchoolId,
}: {
  schools: { id: string; label: string }[];
  initial?: AdminTeamFormInitial;
  /** Hide school dropdown (use initial.schoolId as fixed school). */
  lockSchoolSelect?: boolean;
  /** When creating a team for a single known school (with lockSchoolSelect). */
  fixedSchoolId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [sport, setSport] = useState<SchoolSport>(initial?.sport ?? "RUGBY");
  const resolvedSchoolId = initial?.schoolId ?? fixedSchoolId;

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        const rawId = fd.get("id");
        const id = typeof rawId === "string" && rawId.length > 0 ? rawId : undefined;
        void upsertTeamAction({
          ...(id ? { id } : {}),
          schoolId: fd.get("schoolId"),
          sport: fd.get("sport"),
          gender: sport === "HOCKEY" ? fd.get("gender") : null,
          ageGroup: fd.get("ageGroup"),
          teamLabel: fd.get("teamLabel"),
          teamNickname: fd.get("teamNickname"),
          isFirstTeam: true,
          active: fd.get("active") === "on",
        }).then((res) => {
          setPending(false);
          if (!res.ok) {
            if ("fieldErrors" in res && res.fieldErrors) {
              toast.error("Check the form (hockey needs boys or girls).");
              return;
            }
            if ("error" in res && res.error) {
              toast.error(res.error);
              return;
            }
            toast.error("Save failed");
            return;
          }
          toast.success(initial ? "Team updated" : "Team created");
          if (!initial) {
            (e.target as HTMLFormElement).reset();
            setSport("RUGBY");
          }
          router.refresh();
        });
      }}
    >
      {initial ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="space-y-1 sm:col-span-2">
        <Label>School</Label>
        {lockSchoolSelect && resolvedSchoolId ? (
          <>
            <input type="hidden" name="schoolId" value={resolvedSchoolId} />
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">{schools[0]?.label ?? "—"}</p>
          </>
        ) : (
          <select
            name="schoolId"
            required
            defaultValue={initial?.schoolId}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="space-y-1">
        <Label htmlFor="sport">Sport</Label>
        <select
          id="sport"
          name="sport"
          required
          value={sport}
          onChange={(e) => setSport(e.target.value as SchoolSport)}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
        >
          {SCHOOL_SPORTS.map((s) => (
            <option key={s} value={s}>
              {schoolSportLabel(s)}
            </option>
          ))}
        </select>
      </div>
      {sport === "HOCKEY" ? (
        <div className="space-y-1">
          <Label htmlFor="team-gender">Hockey side *</Label>
          <select
            id="team-gender"
            name="gender"
            required
            defaultValue={initial?.gender ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          >
            <option value="" disabled>
              Select boys or girls…
            </option>
            {TEAM_GENDERS.map((g) => (
              <option key={g} value={g}>
                {teamGenderLabel(g)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div className="space-y-1">
        <Label htmlFor="ageGroup">Age group</Label>
        <Input
          id="ageGroup"
          name="ageGroup"
          defaultValue={initial?.ageGroup ?? "U"}
          placeholder="U plus age (e.g. type 13 for U13)"
          required
        />
        <p className="text-xs text-muted-foreground">The letter U is added automatically if you only type the number.</p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="teamLabel">Team Label (e.g. A, B, C etc)</Label>
        <Input
          id="teamLabel"
          name="teamLabel"
          defaultValue={initial?.teamLabel}
          onBlur={(e) => {
            e.currentTarget.value = e.currentTarget.value.toUpperCase();
          }}
          required
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="teamNickname">Team nickname</Label>
        <Input
          id="teamNickname"
          name="teamNickname"
          defaultValue={initial?.teamNickname ?? ""}
          placeholder="Optional"
        />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="active" id="active-t" defaultChecked={initial?.active ?? true} />
        <Label htmlFor="active-t">Active</Label>
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {initial ? "Save changes" : "Create team"}
      </Button>
    </form>
  );
}
