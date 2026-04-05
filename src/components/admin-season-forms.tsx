"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertSeasonAction, upsertCompetitionAction } from "@/actions/admin-crud";

export function AdminSeasonCreateForm() {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        void upsertSeasonAction({
          year: fd.get("year"),
          name: fd.get("name"),
          startDate: fd.get("startDate"),
          endDate: fd.get("endDate"),
        }).then((res) => {
          setPending(false);
          if (!res.ok) {
            toast.error("Failed");
            return;
          }
          toast.success("Season saved");
          (e.target as HTMLFormElement).reset();
          window.location.reload();
        });
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="year">Year</Label>
        <Input id="year" name="year" type="number" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" placeholder="e.g. 2024 Western Cape" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="startDate">Start</Label>
        <Input id="startDate" name="startDate" type="date" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="endDate">End</Label>
        <Input id="endDate" name="endDate" type="date" required />
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        Add season
      </Button>
    </form>
  );
}

export function AdminCompetitionCreateForm({
  provinces,
}: {
  provinces: { id: string; name: string }[];
}) {
  const [pending, setPending] = useState(false);
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        void upsertCompetitionAction({
          name: fd.get("name"),
          provinceId: fd.get("provinceId") || null,
          organiser: fd.get("organiser") || null,
          level: fd.get("level") || null,
          active: fd.get("active") === "on",
        }).then((res) => {
          setPending(false);
          if (!res.ok) {
            toast.error("Failed");
            return;
          }
          toast.success("Competition saved");
          (e.target as HTMLFormElement).reset();
          window.location.reload();
        });
      }}
    >
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="cname">Name</Label>
        <Input id="cname" name="name" required />
      </div>
      <div className="space-y-1">
        <Label>Province (optional)</Label>
        <select
          name="provinceId"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          defaultValue=""
        >
          <option value="">All / national</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="level">Level</Label>
        <Input id="level" name="level" placeholder="e.g. Regional" />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="organiser">Organiser</Label>
        <Input id="organiser" name="organiser" />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="active" id="c-active" defaultChecked />
        <Label htmlFor="c-active">Active</Label>
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        Add competition
      </Button>
    </form>
  );
}
