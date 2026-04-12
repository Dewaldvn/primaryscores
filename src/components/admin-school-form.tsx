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
    provinceId: string;
    district: string | null;
    town: string | null;
    website: string | null;
    active: boolean;
  };
  /** When creating a school (no `initial`), default form fields from moderation deep-links etc. */
  prefillNew?: { displayName?: string; officialName?: string };
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
          nickname: fd.get("nickname") || null,
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
      {schoolAdminMode && initial ? (
        <>
          <input type="hidden" name="slug" value={initial.slug} />
          <input type="hidden" name="provinceId" value={initial.provinceId} />
          <input type="hidden" name="active" value={initial.active ? "on" : ""} />
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
        <div className="space-y-1">
          <Label htmlFor="slug">Slug (URL)</Label>
          <Input id="slug" name="slug" placeholder="auto from display name" defaultValue={initial?.slug} />
        </div>
      ) : null}
      {!schoolAdminMode ? (
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
      ) : null}
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
      {!schoolAdminMode ? (
        <div className="flex items-center gap-2 sm:col-span-2">
          <input type="checkbox" name="active" id="active" defaultChecked={initial?.active ?? true} />
          <Label htmlFor="active">Active</Label>
        </div>
      ) : null}
      <Button type="submit" disabled={pending} className="sm:col-span-2">
        {initial ? "Update school" : "Create school"}
      </Button>
    </form>
  );
}
