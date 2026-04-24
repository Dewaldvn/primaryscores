"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
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
import { Button } from "@/components/ui/button";
import { AdminRowLinkButton } from "@/components/admin-nav-table-row";
import { adminDirectoryZebraTableRowClass } from "@/lib/admin-directory-style";
import { bulkDeleteTeamsAction } from "@/actions/admin-crud";

type Row = {
  team: {
    id: string;
    sport: string;
    gender: string | null;
    ageGroup: string;
    teamLabel: string;
    teamNickname: string | null;
    active: boolean;
  };
  schoolName: string;
  schoolId: string;
};

export function AdminTeamsRosterTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggle(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function onDeleteSelected() {
    if (selected.size === 0) {
      toast.error("Select at least one team.");
      return;
    }
    start(async () => {
      const res = await bulkDeleteTeamsAction({ ids: Array.from(selected) });
      if (!res.ok) {
        toast.error("error" in res && res.error ? res.error : "Could not delete selected teams.");
        return;
      }
      toast.success(`Deleted ${res.deletedCount} team(s).`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button type="button" variant="destructive" onClick={onDeleteSelected} disabled={pending || selected.size === 0}>
          {pending ? "Deleting..." : `Delete selected (${selected.size})`}
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>School</TableHead>
            <TableHead>Sport</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Age</TableHead>
            <TableHead>Label</TableHead>
            <TableHead>Nickname</TableHead>
            <TableHead>Active</TableHead>
            <TableHead className="text-right">Actions</TableHead>
            <TableHead className="w-12 text-right">Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={r.team.id} className={adminDirectoryZebraTableRowClass(i)}>
              <TableCell>
                <Link href={`/admin/schools/${r.schoolId}`} className="underline-offset-2 hover:underline">
                  {r.schoolName}
                </Link>
              </TableCell>
              <TableCell>{r.team.sport}</TableCell>
              <TableCell>{r.team.gender ?? "—"}</TableCell>
              <TableCell>{r.team.ageGroup}</TableCell>
              <TableCell>{r.team.teamLabel}</TableCell>
              <TableCell className="text-muted-foreground">{r.team.teamNickname ?? "—"}</TableCell>
              <TableCell>{r.team.active ? "Yes" : "No"}</TableCell>
              <TableCell className="text-right">
                <AdminRowLinkButton href={`/admin/teams/${r.team.id}`} variant="outline" size="sm">
                  Edit
                </AdminRowLinkButton>
              </TableCell>
              <TableCell className="text-right">
                <input
                  type="checkbox"
                  checked={selected.has(r.team.id)}
                  onChange={(e) => toggle(r.team.id, e.currentTarget.checked)}
                  aria-label={`Select ${r.schoolName} ${r.team.sport} ${r.team.ageGroup} ${r.team.teamLabel}`}
                />
              </TableCell>
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} className="text-center text-sm text-muted-foreground">
                No teams found.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </div>
  );
}
