"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertTeamAction } from "@/actions/admin-crud";

export function AdminTeamForm({
  schools,
}: {
  schools: { id: string; label: string }[];
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        void upsertTeamAction({
          schoolId: fd.get("schoolId"),
          ageGroup: fd.get("ageGroup"),
          teamLabel: fd.get("teamLabel"),
          isFirstTeam: fd.get("isFirstTeam") === "on",
          active: fd.get("active") === "on",
        }).then((res) => {
          setPending(false);
          if (!res.ok) {
            toast.error("Save failed");
            return;
          }
          toast.success("Team created");
          (e.target as HTMLFormElement).reset();
          window.location.reload();
        });
      }}
    >
      <div className="space-y-1 sm:col-span-2">
        <Label>School</Label>
        <select
          name="schoolId"
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
        >
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="ageGroup">Age group</Label>
        <Input id="ageGroup" name="ageGroup" defaultValue="U13" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="teamLabel">Team label</Label>
        <Input id="teamLabel" name="teamLabel" defaultValue="A" required />
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="isFirstTeam" id="isFirstTeam" defaultChecked />
        <Label htmlFor="isFirstTeam">First team</Label>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" name="active" id="active-t" defaultChecked />
        <Label htmlFor="active-t">Active</Label>
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        Create team
      </Button>
    </form>
  );
}
