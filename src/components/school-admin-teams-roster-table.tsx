"use client";

import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LinkButton } from "@/components/link-button";

export type SchoolAdminTeamRosterRow = {
  id: string;
  schoolName: string;
  sport: string;
  gender: string | null;
  ageGroup: string;
  teamLabel: string;
  teamNickname: string | null;
};

export function SchoolAdminTeamsRosterTable({ rows }: { rows: SchoolAdminTeamRosterRow[] }) {
  const router = useRouter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>School</TableHead>
          <TableHead>Sport</TableHead>
          <TableHead>Gender</TableHead>
          <TableHead>Age</TableHead>
          <TableHead>Label</TableHead>
          <TableHead>Nickname</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow
            key={r.id}
            className="cursor-pointer hover:bg-muted/50"
            onClick={() => router.push(`/school-admin/scores?teamId=${encodeURIComponent(r.id)}`)}
          >
            <TableCell>{r.schoolName}</TableCell>
            <TableCell>{r.sport}</TableCell>
            <TableCell>{r.gender ?? "—"}</TableCell>
            <TableCell>{r.ageGroup}</TableCell>
            <TableCell>{r.teamLabel}</TableCell>
            <TableCell className="text-muted-foreground">{r.teamNickname ?? "—"}</TableCell>
            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
              <LinkButton href={`/school-admin/teams/${r.id}`} variant="outline" size="sm">
                Edit
              </LinkButton>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
