"use client";

import { useState, useTransition } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  approveSchoolAdminMembershipAction,
  rejectSchoolAdminMembershipAction,
} from "@/actions/school-admin-membership";
import type { PendingSchoolAdminClaimRow } from "@/lib/data/school-admin-dashboard";

export function ModeratorSchoolAdminClaims({ rows }: { rows: PendingSchoolAdminClaimRow[] }) {
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">School admin requests</h2>
      <p className="text-sm text-muted-foreground">
        Users with the School Admin role are asking to manage a specific school. Approve only when
        you are satisfied they represent that school.
      </p>
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Requested</TableHead>
              <TableHead>School</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Letter</TableHead>
              <TableHead>Admin tools</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.membershipId}>
                <TableCell className="whitespace-nowrap text-sm">
                  {format(new Date(r.requestedAt), "dd MMM yyyy HH:mm")}
                </TableCell>
                <TableCell className="font-medium">{r.schoolDisplayName}</TableCell>
                <TableCell className="text-sm">
                  <div>{r.profileDisplayName}</div>
                  <div className="font-mono text-xs text-muted-foreground">{r.profileEmail}</div>
                </TableCell>
                <TableCell className="text-sm">
                  {r.requestedLetterUrl ? (
                    <a
                      href={r.requestedLetterUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      {r.requestedLetterFileName ?? "Open letter"}
                    </a>
                  ) : (
                    <span className="text-muted-foreground">Missing</span>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  <a
                    href={`/admin/users?email=${encodeURIComponent(r.profileEmail)}`}
                    className="text-primary underline"
                  >
                    Open user roles
                  </a>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      disabled={pending && busyId === r.membershipId}
                      onClick={() => {
                        setBusyId(r.membershipId);
                        start(async () => {
                          const res = await approveSchoolAdminMembershipAction({
                            membershipId: r.membershipId,
                          });
                          setBusyId(null);
                          if (!res.ok) {
                            toast.error("error" in res ? res.error : "Approve failed");
                            return;
                          }
                          toast.success("School link approved");
                          window.location.reload();
                        });
                      }}
                    >
                      Approve
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pending && busyId === r.membershipId}
                      onClick={() => {
                        setBusyId(r.membershipId);
                        start(async () => {
                          const res = await rejectSchoolAdminMembershipAction({
                            membershipId: r.membershipId,
                          });
                          setBusyId(null);
                          if (!res.ok) {
                            toast.error("error" in res ? res.error : "Reject failed");
                            return;
                          }
                          toast.success("Request rejected");
                          window.location.reload();
                        });
                      }}
                    >
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
