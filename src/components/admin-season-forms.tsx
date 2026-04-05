"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { upsertSeasonAction, upsertCompetitionAction } from "@/actions/admin-crud";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type SeasonFormInitial = {
  id: string;
  year: number;
  name: string;
  startDate: string;
  endDate: string;
};

export function AdminSeasonForm({ initial }: { initial?: SeasonFormInitial }) {
  const [pending, setPending] = useState(false);
  const editing = Boolean(initial);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        void upsertSeasonAction({
          id: initial?.id,
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
          toast.success(editing ? "Season updated" : "Season saved");
          if (!editing) (e.target as HTMLFormElement).reset();
          window.location.href = "/admin/seasons#admin-seasons-section";
        });
      }}
    >
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="space-y-1">
        <Label htmlFor="year">Year</Label>
        <Input
          id="year"
          name="year"
          type="number"
          required
          defaultValue={initial?.year}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          placeholder="e.g. 2024 Western Cape"
          required
          defaultValue={initial?.name}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="startDate">Start</Label>
        <Input
          id="startDate"
          name="startDate"
          type="date"
          required
          defaultValue={initial?.startDate}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="endDate">End</Label>
        <Input
          id="endDate"
          name="endDate"
          type="date"
          required
          defaultValue={initial?.endDate}
        />
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Save changes" : "Add season"}
        </Button>
        {editing ? (
          <Link
            href="/admin/seasons#admin-seasons-section"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center justify-center")}
          >
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}

export type CompetitionFormInitial = {
  id: string;
  name: string;
  provinceId: string | null;
  organiser: string | null;
  level: string | null;
  active: boolean;
};

export function AdminCompetitionForm({
  provinces,
  initial,
}: {
  provinces: { id: string; name: string }[];
  initial?: CompetitionFormInitial;
}) {
  const [pending, setPending] = useState(false);
  const editing = Boolean(initial);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        void upsertCompetitionAction({
          id: initial?.id,
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
          toast.success(editing ? "Competition updated" : "Competition saved");
          if (!editing) (e.target as HTMLFormElement).reset();
          window.location.href = "/admin/seasons#admin-competitions-section";
        });
      }}
    >
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="cname">Name</Label>
        <Input id="cname" name="name" required defaultValue={initial?.name} />
      </div>
      <div className="space-y-1">
        <Label>Province (optional)</Label>
        <select
          name="provinceId"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          defaultValue={initial?.provinceId ?? ""}
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
        <Input id="level" name="level" placeholder="e.g. Regional" defaultValue={initial?.level ?? ""} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="organiser">Organiser</Label>
        <Input id="organiser" name="organiser" defaultValue={initial?.organiser ?? ""} />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input
          type="checkbox"
          name="active"
          id="c-active"
          defaultChecked={initial?.active ?? true}
        />
        <Label htmlFor="c-active">Active</Label>
      </div>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {editing ? "Save changes" : "Add competition"}
        </Button>
        {editing ? (
          <Link
            href="/admin/seasons#admin-competitions-section"
            className={cn(buttonVariants({ variant: "outline" }), "inline-flex items-center justify-center")}
          >
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
