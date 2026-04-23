"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { mergeSchoolsAction } from "@/actions/admin-merge";
import { deleteTeamAction } from "@/actions/admin-crud";
import { compareTeamsBySportAndChronologicalAge } from "@/lib/team-sort";
import type { SchoolSport } from "@/lib/sports";

type MergeSchool = {
  id: string;
  officialName: string;
  displayName: string;
  nickname: string | null;
  slug: string;
  provinceId: string;
  town: string | null;
  website: string | null;
  active: boolean;
  schoolType: "PRIMARY" | "SECONDARY" | "COMBINED";
  logoPath: string | null;
};

type MergeTeam = {
  id: string;
  sport: string;
  ageGroup: string;
  gender: string | null;
  teamLabel: string;
};

const FIELD_ROWS: Array<{ key: keyof MergeSchool; label: string; mergeable: boolean }> = [
  { key: "displayName", label: "Display name", mergeable: true },
  { key: "officialName", label: "Official name", mergeable: true },
  { key: "nickname", label: "Nickname", mergeable: true },
  { key: "schoolType", label: "School type", mergeable: true },
  { key: "provinceId", label: "Province", mergeable: true },
  { key: "town", label: "Town", mergeable: true },
  { key: "website", label: "Website", mergeable: true },
  { key: "active", label: "Active", mergeable: true },
  { key: "logoPath", label: "Logo path", mergeable: true },
  { key: "slug", label: "Slug (kept on target)", mergeable: false },
];

function teamKey(t: MergeTeam): string {
  return `${t.sport}|${t.ageGroup}|${t.teamLabel.toUpperCase()}|${t.gender ?? "__none__"}`;
}

function formatFieldValue(v: unknown): string {
  if (v == null) return "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

function formatTeamLine(t: MergeTeam): string {
  return `${t.sport} · ${t.ageGroup}${t.gender ? ` · ${t.gender}` : ""} · ${t.teamLabel}`;
}

export function AdminSchoolMergeForm({
  source,
  target,
  sourceProvinceName,
  targetProvinceName,
  sourceTeams,
  targetTeams,
}: {
  source: MergeSchool;
  target: MergeSchool;
  sourceProvinceName: string;
  targetProvinceName: string;
  sourceTeams: MergeTeam[];
  targetTeams: MergeTeam[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [chooseSourceFields, setChooseSourceFields] = useState<Set<string>>(new Set());
  const [deleteSourceWhenDone, setDeleteSourceWhenDone] = useState(false);
  const [remainingSourceTeams, setRemainingSourceTeams] = useState<MergeTeam[]>([]);
  const [deletingTeamIds, setDeletingTeamIds] = useState<Set<string>>(new Set());

  const conflictKeys = useMemo(() => {
    const set = new Set<string>();
    for (const t of targetTeams) set.add(teamKey(t));
    return set;
  }, [targetTeams]);

  const orderedSourceTeams = useMemo(
    () =>
      [...sourceTeams].sort((a, b) =>
        compareTeamsBySportAndChronologicalAge(
          {
            sport: a.sport as SchoolSport,
            ageGroup: a.ageGroup,
            gender: a.gender as "MALE" | "FEMALE" | null,
            teamLabel: a.teamLabel,
          },
          {
            sport: b.sport as SchoolSport,
            ageGroup: b.ageGroup,
            gender: b.gender as "MALE" | "FEMALE" | null,
            teamLabel: b.teamLabel,
          },
        ),
      ),
    [sourceTeams],
  );

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(
    orderedSourceTeams.map((t) => t.id),
  );

  function toggleField(key: string, useSource: boolean) {
    setChooseSourceFields((prev) => {
      const next = new Set(prev);
      if (useSource) next.add(key);
      else next.delete(key);
      return next;
    });
  }

  function toggleTeam(id: string, checked: boolean) {
    setSelectedTeamIds((prev) => {
      const set = new Set(prev);
      if (checked) set.add(id);
      else set.delete(id);
      return Array.from(set);
    });
  }

  function submitMerge() {
    startTransition(async () => {
      const res = await mergeSchoolsAction({
        sourceSchoolId: source.id,
        targetSchoolId: target.id,
        chooseSourceFields: Array.from(chooseSourceFields),
        selectedSourceTeamIds: selectedTeamIds,
        deleteSourceWhenDone,
      });
      if (!res.ok) {
        toast.error("error" in res ? (res.error ?? "Merge failed.") : "Merge failed.");
        return;
      }
      setRemainingSourceTeams((res.remainingSourceTeams ?? []) as MergeTeam[]);
      toast.success(
        `Merged ${res.mergedTeamCount} team(s) into ${target.displayName}${
          res.mergedSimilarTeamCount ? ` and merged ${res.mergedSimilarTeamCount} similar team(s)` : ""
        }${res.skippedConflictTeamCount ? ` (${res.skippedConflictTeamCount} skipped duplicates)` : ""}.`,
      );
      if (deleteSourceWhenDone) {
        if (res.sourceDeleted) toast.success(`Deleted source school: ${source.displayName}.`);
        else if (res.deleteMessage) toast.warning(res.deleteMessage);
      }
      router.refresh();
    });
  }

  async function deleteRemainingTeam(teamId: string) {
    setDeletingTeamIds((prev) => {
      const next = new Set(prev);
      next.add(teamId);
      return next;
    });
    const res = await deleteTeamAction({ id: teamId });
    setDeletingTeamIds((prev) => {
      const next = new Set(prev);
      next.delete(teamId);
      return next;
    });
    if (!res.ok) {
      toast.error("error" in res ? (res.error ?? "Team delete failed.") : "Team delete failed.");
      return;
    }
    setRemainingSourceTeams((prev) => prev.filter((t) => t.id !== teamId));
    toast.success("Team deleted.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border p-3">
          <p className="text-sm font-semibold">Source school (move from)</p>
          <p className="text-sm text-muted-foreground">{source.displayName}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-sm font-semibold">Target school (merge into)</p>
          <p className="text-sm text-muted-foreground">{target.displayName}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-3 py-2 text-left">Field</th>
              <th className="px-3 py-2 text-left">Source</th>
              <th className="px-3 py-2 text-left">Target</th>
              <th className="px-3 py-2 text-left">Use source?</th>
            </tr>
          </thead>
          <tbody>
            {FIELD_ROWS.map((f) => (
              <tr key={f.key} className="border-b">
                <td className="px-3 py-2 font-medium">{f.label}</td>
                <td className="px-3 py-2">
                  {f.key === "provinceId" ? sourceProvinceName : formatFieldValue(source[f.key])}
                </td>
                <td className="px-3 py-2">
                  {f.key === "provinceId" ? targetProvinceName : formatFieldValue(target[f.key])}
                </td>
                <td className="px-3 py-2">
                  {f.mergeable ? (
                    <input
                      type="checkbox"
                      checked={chooseSourceFields.has(f.key)}
                      onChange={(e) => toggleField(f.key, e.currentTarget.checked)}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 rounded-md border p-3">
        <p className="text-sm font-semibold">Teams to move/merge from source to target</p>
        {orderedSourceTeams.length === 0 ? (
          <p className="text-sm text-muted-foreground">No teams on source school.</p>
        ) : (
          <ul className="space-y-1">
            {orderedSourceTeams.map((t) => {
              const conflict = conflictKeys.has(teamKey(t));
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedTeamIds.includes(t.id)}
                      onChange={(e) => toggleTeam(t.id, e.currentTarget.checked)}
                    />
                    <span>{formatTeamLine(t)}</span>
                  </label>
                  {conflict ? <span className="text-xs text-amber-700">Will merge into existing target team</span> : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        <p>
          Source school is kept by default. You can explicitly approve deletion after merge below.
        </p>
        <label className="flex items-center gap-2 font-medium">
          <input
            type="checkbox"
            checked={deleteSourceWhenDone}
            onChange={(e) => setDeleteSourceWhenDone(e.currentTarget.checked)}
          />
          Delete source school after successful merge (approved)
        </label>
        <p className="text-xs">
          Deletion only proceeds when no teams remain on source and no other references block delete.
        </p>
        {deleteSourceWhenDone && remainingSourceTeams.length > 0 ? (
          <div className="mt-2 space-y-2 rounded-md border border-amber-400 bg-white p-3 text-amber-900">
            <p className="text-sm font-semibold">
              Teams still linked to source school (delete these to allow source deletion):
            </p>
            <ul className="space-y-1">
              {remainingSourceTeams.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2 rounded-md border px-2 py-1.5">
                  <span>{formatTeamLine(t)}</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={deletingTeamIds.has(t.id)}
                    onClick={() => void deleteRemainingTeam(t.id)}
                  >
                    {deletingTeamIds.has(t.id) ? "Deleting..." : "Delete team"}
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <Button type="button" disabled={pending} onClick={submitMerge}>
        {pending ? "Merging..." : "Merge into target school"}
      </Button>
    </div>
  );
}
