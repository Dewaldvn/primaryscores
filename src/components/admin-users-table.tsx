"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { updateUserRoleAction } from "@/actions/admin-users";
import type { ProfileRole } from "@/lib/auth";

export function AdminUsersTable({
  rows,
}: {
  rows: {
    id: string;
    email: string;
    displayName: string;
    role: ProfileRole;
  }[];
}) {
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Role</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-mono text-xs">{r.email}</TableCell>
            <TableCell>{r.displayName}</TableCell>
            <TableCell>
              <select
                className="rounded-md border px-2 py-1 text-sm"
                defaultValue={r.role}
                disabled={busy === r.id}
                onChange={(e) => {
                  const role = e.target.value as ProfileRole;
                  setBusy(r.id);
                  void updateUserRoleAction({ userId: r.id, role }).then((res) => {
                    setBusy(null);
                    if (!res.ok) toast.error("Update failed");
                    else toast.success("Role updated");
                  });
                }}
              >
                {(
                  [
                    "PUBLIC",
                    "CONTRIBUTOR",
                    "MODERATOR",
                    "ADMIN",
                    "SCHOOL_ADMIN",
                  ] as const satisfies readonly ProfileRole[]
                ).map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </TableCell>
            <TableCell />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
