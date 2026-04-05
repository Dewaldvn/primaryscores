"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { upsertSchoolAction } from "@/actions/admin-crud";

export function AdminSchoolForm({
  provinces,
  initial,
}: {
  provinces: { id: string; name: string }[];
  initial?: {
    id: string;
    officialName: string;
    displayName: string;
    slug: string;
    provinceId: string;
    district: string | null;
    town: string | null;
    website: string | null;
    active: boolean;
  };
}) {
  const [pending, setPending] = useState(false);

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setPending(true);
        void upsertSchoolAction({
          id: initial?.id,
          officialName: fd.get("officialName"),
          displayName: fd.get("displayName"),
          slug: fd.get("slug") || undefined,
          provinceId: fd.get("provinceId"),
          district: fd.get("district") || null,
          town: fd.get("town") || null,
          website: fd.get("website") || null,
          active: fd.get("active") === "on",
        }).then((res) => {
          setPending(false);
          if (!res.ok) {
            toast.error("Save failed");
            return;
          }
          toast.success("Saved");
          if (!initial) (e.target as HTMLFormElement).reset();
          window.location.reload();
        });
      }}
    >
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="displayName">Display name</Label>
        <Input
          id="displayName"
          name="displayName"
          required
          defaultValue={initial?.displayName}
        />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="officialName">Official name</Label>
        <Input
          id="officialName"
          name="officialName"
          required
          defaultValue={initial?.officialName}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input id="slug" name="slug" placeholder="auto from display name" defaultValue={initial?.slug} />
      </div>
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
      <div className="space-y-1">
        <Label htmlFor="district">District</Label>
        <Input id="district" name="district" defaultValue={initial?.district ?? ""} />
      </div>
      <div className="space-y-1 sm:col-span-2">
        <Label htmlFor="website">Website</Label>
        <Input id="website" name="website" type="url" defaultValue={initial?.website ?? ""} />
      </div>
      <div className="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="active" id="active" defaultChecked={initial?.active ?? true} />
        <Label htmlFor="active">Active</Label>
      </div>
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {initial ? "Update school" : "Create school"}
      </Button>
    </form>
  );
}
