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
import { deleteUserAction, updateUserRoleAction } from "@/actions/admin-users";
import type { ProfileRole } from "@/lib/auth";

export function AdminUsersTable({
  rows,
  initialEmailFilter = "",
}: {
  rows: {
    id: string;
    email: string;
    displayName: string;
    role: ProfileRole;
  }[];
  initialEmailFilter?: string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [emailFilter, setEmailFilter] = useState(initialEmailFilter.trim().toLowerCase());
  const filtered = emailFilter
    ? rows.filter((r) => r.email.toLowerCase().includes(emailFilter))
    : rows;

  return (
    <div className="space-y-3">
      <div className="max-w-sm">
        <input
          className="h-9 w-full rounded-md border px-2 text-sm"
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value.trim().toLowerCase())}
          placeholder="Filter by email…"
        />
      </div>
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
          {filtered.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="font-mono text-xs">{r.email}</TableCell>
              <TableCell>{r.displayName}</TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-2">
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
                  <button
                    type="button"
                    className="rounded-md border border-destructive px-2 py-1 text-xs text-destructive disabled:opacity-50"
                    disabled={busy === r.id}
                    onClick={() => {
                      if (!window.confirm(`Delete user ${r.email}? This cannot be undone.`)) return;
                      setBusy(r.id);
                      void deleteUserAction({ userId: r.id }).then((res) => {
                        setBusy(null);
                        if (!res.ok) {
                          toast.error("Delete failed");
                          return;
                        }
                        toast.success("User deleted");
                        window.location.reload();
                      });
                    }}
                  >
                    Delete user
                  </button>
                </div>
              </TableCell>
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
