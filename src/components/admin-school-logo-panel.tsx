"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { removeSchoolLogoAction, uploadSchoolLogoAction } from "@/actions/school-logo";
import { SchoolLogo } from "@/components/school-logo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

export function AdminSchoolLogoPanel({
  schoolId,
  displayName,
  logoPath,
}: {
  schoolId: string;
  displayName: string;
  logoPath: string | null;
}) {
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
      <Label>School logo</Label>
      <div className="flex flex-wrap items-center gap-4">
        <SchoolLogo logoPath={logoPath} alt={displayName} size="lg" />
        <div className="flex flex-col gap-2 text-sm">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
            className="max-w-xs text-xs file:mr-2 file:rounded-md file:border file:bg-background file:px-2 file:py-1"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const fd = new FormData();
              fd.set("schoolId", schoolId);
              fd.set("file", file);
              start(async () => {
                const res = await uploadSchoolLogoAction(fd);
                if (!res.ok) {
                  toast.error(res.error);
                  return;
                }
                toast.success("Logo updated");
                e.target.value = "";
                window.location.reload();
              });
            }}
          />
          <p className="text-xs text-muted-foreground">PNG, JPG, WebP, GIF, or SVG. Max 2 MB.</p>
          {logoPath ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => {
                start(async () => {
                  const res = await removeSchoolLogoAction(schoolId);
                  if (!res.ok) {
                    toast.error("Could not remove logo");
                    return;
                  }
                  toast.success("Logo removed");
                  window.location.reload();
                });
              }}
            >
              Remove logo
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
