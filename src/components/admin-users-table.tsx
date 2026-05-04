"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteUserAction, setUserBannedAction, updateUserRoleAction } from "@/actions/admin-users";
import type { ProfileRole } from "@/lib/auth";

const ROLES: readonly ProfileRole[] = ["CONTRIBUTOR", "MODERATOR", "ADMIN", "SCHOOL_ADMIN"];
export type UserRoleFilter = "ALL" | ProfileRole;

export function AdminUsersTable({
  rows,
  initialQuery = "",
  initialRole = "ALL",
}: {
  rows: {
    id: string;
    email: string;
    displayName: string;
    role: ProfileRole;
    bannedAt: Date | null;
  }[];
  initialQuery?: string;
  initialRole?: UserRoleFilter;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery.trim());
  const [roleFilter, setRoleFilter] = useState<UserRoleFilter>(initialRole);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (roleFilter !== "ALL" && r.role !== roleFilter) return false;
      if (!q) return true;
      if (r.email.toLowerCase().includes(q)) return true;
      if (r.displayName.toLowerCase().includes(q)) return true;
      if (r.id.toLowerCase().includes(q)) return true;
      if (r.role.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [rows, query, roleFilter]);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="users-search">Search</Label>
          <Input
            id="users-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Email, name, user id, or role name…"
            className="max-w-md"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="users-role">Filter by role</Label>
          <select
            id="users-role"
            className="flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-2 text-sm"
            value={roleFilter}
            onChange={(e) => {
              const v = (e.target.value === "ALL" ? "ALL" : e.target.value) as UserRoleFilter;
              setRoleFilter(v);
            }}
          >
            <option value="ALL">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      </div>
      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users match your search and role filter.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status / actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-mono text-xs">{r.email}</TableCell>
                <TableCell>{r.displayName}</TableCell>
                <TableCell>
                  <select
                    className="rounded-md border px-2 py-1 text-sm"
                    defaultValue={r.role}
                    key={`${r.id}-${r.role}`}
                    disabled={busy === r.id}
                    onChange={(e) => {
                      const newRole = e.target.value as ProfileRole;
                      setBusy(r.id);
                      void updateUserRoleAction({ userId: r.id, role: newRole }).then((res) => {
                        setBusy(null);
                        if (!res.ok) toast.error("Update failed");
                        else {
                          toast.success("Role updated");
                          router.refresh();
                        }
                      });
                    }}
                  >
                    {(
                      ["CONTRIBUTOR", "MODERATOR", "ADMIN", "SCHOOL_ADMIN"] as const satisfies readonly ProfileRole[]
                    ).map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2">
                    <span className="text-xs text-muted-foreground">{r.bannedAt ? "Banned" : "Active"}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border px-2 py-1 text-xs disabled:opacity-50"
                        disabled={busy === r.id}
                        onClick={() => {
                          const nextBanned = !r.bannedAt;
                          const msg = nextBanned
                            ? `Ban ${r.email}? They will be blocked from contributor actions until unbanned.`
                            : `Remove ban for ${r.email}?`;
                          if (!window.confirm(msg)) return;
                          setBusy(r.id);
                          void setUserBannedAction({ userId: r.id, banned: nextBanned }).then((res) => {
                            setBusy(null);
                            if (!res.ok) toast.error("Update failed");
                            else {
                              toast.success(nextBanned ? "User banned" : "Ban removed");
                              router.refresh();
                            }
                          });
                        }}
                      >
                        {r.bannedAt ? "Unban" : "Ban"}
                      </button>
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
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
