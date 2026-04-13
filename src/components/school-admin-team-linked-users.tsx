"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  schoolAdminLinkProfileToTeamAction,
  schoolAdminUnlinkProfileFromTeamAction,
} from "@/actions/school-admin-team-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type TeamLinkedUserRow = {
  profileId: string;
  email: string;
  displayName: string;
};

export function SchoolAdminTeamLinkedUsers({
  teamId,
  initialRows,
}: {
  teamId: string;
  initialRows: TeamLinkedUserRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, start] = useTransition();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Link registered users (by email) to this team — for example coaches or managers. They must already have an
        account on the site.
      </p>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const res = await schoolAdminLinkProfileToTeamAction({ teamId, email });
            if (!res.ok) {
              toast.error("error" in res ? res.error : "Could not link user.");
              return;
            }
            toast.success("User linked to team.");
            setEmail("");
            router.refresh();
          });
        }}
      >
        <div className="min-w-0 flex-1 space-y-1">
          <Label htmlFor="link-email">User email</Label>
          <Input
            id="link-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
            required
          />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Link user"}
        </Button>
      </form>

      {initialRows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No linked users yet.</p>
      ) : (
        <ul className="divide-y rounded-md border text-sm">
          {initialRows.map((r) => (
            <li key={r.profileId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <div className="font-medium">{r.displayName}</div>
                <div className="text-xs text-muted-foreground">{r.email}</div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 text-destructive hover:text-destructive"
                disabled={pending}
                onClick={() => {
                  if (!window.confirm(`Remove ${r.email} from this team?`)) return;
                  start(async () => {
                    const res = await schoolAdminUnlinkProfileFromTeamAction({
                      teamId,
                      profileId: r.profileId,
                    });
                    if (!res.ok) {
                      toast.error("error" in res ? res.error : "Could not remove link.");
                      return;
                    }
                    toast.success("Link removed.");
                    router.refresh();
                  });
                }}
              >
                Remove
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
