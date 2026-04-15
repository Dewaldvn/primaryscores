"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { upsertSeasonAction, upsertCompetitionAction } from "@/actions/admin-crud";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SCHOOL_SPORTS, schoolSportLabel, type SchoolSport } from "@/lib/sports";

export type SeasonFormInitial = {
  id: string;
  sport: SchoolSport;
  provinceId: string | null;
  year: number;
  name: string;
};

export function AdminSeasonForm({
  initial,
  provinces,
}: {
  initial?: SeasonFormInitial;
  provinces: { id: string; name: string }[];
}) {
  const [pending, setPending] = useState(false);
  const editing = Boolean(initial);
  const years = Array.from({ length: 2050 - 2020 + 1 }, (_, i) => 2020 + i);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        void upsertSeasonAction({
          id: initial?.id,
          sport: fd.get("sport") || "RUGBY",
          provinceId: fd.get("provinceId") || null,
          year: fd.get("year"),
          name: fd.get("name"),
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
        <Label htmlFor="season-sport">Sport</Label>
        <select
          id="season-sport"
          name="sport"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          defaultValue={initial?.sport ?? "RUGBY"}
        >
          {SCHOOL_SPORTS.map((s) => (
            <option key={s} value={s}>
              {schoolSportLabel(s)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="year">Year</Label>
        <select
          id="year"
          name="year"
          required
          defaultValue={String(initial?.year ?? new Date().getFullYear())}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
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
        <Label htmlFor="season-province">Province (optional)</Label>
        <select
          id="season-province"
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
  sport: SchoolSport;
  year: number | null;
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
  const years = Array.from({ length: 2050 - 2020 + 1 }, (_, i) => 2020 + i);

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
          sport: fd.get("sport") || "RUGBY",
          year: fd.get("year") || null,
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
        <Label htmlFor="competition-sport">Sport</Label>
        <select
          id="competition-sport"
          name="sport"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          defaultValue={initial?.sport ?? "RUGBY"}
        >
          {SCHOOL_SPORTS.map((s) => (
            <option key={s} value={s}>
              {schoolSportLabel(s)}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="competition-year">Year (optional)</Label>
        <select
          id="competition-year"
          name="year"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
          defaultValue={initial?.year != null ? String(initial.year) : ""}
        >
          <option value="">Not set</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
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
