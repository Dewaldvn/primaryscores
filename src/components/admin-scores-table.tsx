"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { adminUpdateResultAction } from "@/actions/admin-results";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LinkButton } from "@/components/link-button";
import { SchoolLogo } from "@/components/school-logo";

export type AdminScoreRowSerialized = {
  resultId: string;
  fixtureId: string;
  homeScore: number;
  awayScore: number;
  verificationLevel: "SUBMITTED" | "MODERATOR_VERIFIED" | "SOURCE_VERIFIED";
  isVerified: boolean;
  publishedAt: string | null;
  matchDate: string;
  venue: string | null;
  recordingUrl: string | null;
  homeSchoolName: string;
  awaySchoolName: string;
  homeSchoolLogoPath: string | null;
  awaySchoolLogoPath: string | null;
  competitionName: string | null;
  seasonName: string | null;
  provinceName: string | null;
};

export function AdminScoresTable({
  rows,
  total,
  page,
  pageSize,
  initialSearch,
  scoresBasePath = "/admin/scores",
  verificationCap = "all",
  teamFilterId,
  teamFilterLabel,
}: {
  rows: AdminScoreRowSerialized[];
  total: number;
  page: number;
  pageSize: number;
  initialSearch: string;
  /** List + pagination URLs (defaults to full admin scores). */
  scoresBasePath?: string;
  /** School admins cannot assign source-verified. */
  verificationCap?: "all" | "moderator_only";
  /** When set, results are limited to fixtures involving this team (home or away). */
  teamFilterId?: string;
  teamFilterLabel?: string | null;
}) {
  function scoresListHref(pageNum: number, search: string): string {
    const q = new URLSearchParams();
    if (search.trim().length >= 2) q.set("q", search.trim());
    q.set("page", String(pageNum));
    if (teamFilterId) q.set("teamId", teamFilterId);
    return `${scoresBasePath}?${q.toString()}`;
  }
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [editing, setEditing] = useState<AdminScoreRowSerialized | null>(null);
  const [pending, start] = useTransition();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openEdit(row: AdminScoreRowSerialized) {
    let next = { ...row };
    if (verificationCap === "moderator_only" && next.verificationLevel === "SOURCE_VERIFIED") {
      next = { ...next, verificationLevel: "MODERATOR_VERIFIED" };
    }
    setEditing(next);
  }

  function saveEdit() {
    if (!editing) return;
    start(async () => {
      const res = await adminUpdateResultAction({
        resultId: editing.resultId,
        homeScore: editing.homeScore,
        awayScore: editing.awayScore,
        matchDate: editing.matchDate,
        venue: editing.venue,
        recordingUrl: editing.recordingUrl,
        isVerified: editing.isVerified,
        verificationLevel: editing.verificationLevel,
      });
      if (!res.ok) {
        if ("fieldErrors" in res && res.fieldErrors) {
          toast.error("Check the form fields.");
        } else if ("error" in res) toast.error(res.error);
        return;
      }
      toast.success("Score updated.");
      setEditing(null);
      window.location.reload();
    });
  }

  return (
    <div className="space-y-4">
      {teamFilterId && teamFilterLabel ? (
        <div className="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm">
          Showing matches involving <strong>{teamFilterLabel}</strong>.{" "}
          <Link href={scoresBasePath} className="text-primary underline">
            Clear team filter
          </Link>
        </div>
      ) : null}
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        action={scoresBasePath}
        method="get"
      >
        <input type="hidden" name="page" value="1" />
        {teamFilterId ? <input type="hidden" name="teamId" value={teamFilterId} /> : null}
        <div className="flex-1 space-y-1">
          <Label htmlFor="q">Search schools, competition, or season</Label>
          <Input
            id="q"
            name="q"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Min. 2 characters"
          />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <p className="text-sm text-muted-foreground">
        {total} result{total !== 1 ? "s" : ""} · page {page} of {totalPages}
      </p>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Match</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Competition</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.resultId}>
                <TableCell className="whitespace-nowrap text-sm">
                  {r.matchDate
                    ? format(new Date(`${r.matchDate}T12:00:00`), "d MMM yyyy")
                    : "—"}
                </TableCell>
                <TableCell className="max-w-[260px] text-sm">
                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                    <span className="inline-flex items-center gap-1.5">
                      <SchoolLogo logoPath={r.homeSchoolLogoPath} alt="" size="xs" />
                      <span className="font-medium">{r.homeSchoolName}</span>
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    <span className="inline-flex items-center gap-1.5">
                      <SchoolLogo logoPath={r.awaySchoolLogoPath} alt="" size="xs" />
                      <span className="font-medium">{r.awaySchoolName}</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="font-mono tabular-nums">
                  {r.homeScore} – {r.awayScore}
                </TableCell>
                <TableCell className="max-w-[180px] text-xs text-muted-foreground">
                  {r.competitionName ?? "—"}
                  <br />
                  {r.seasonName ?? "—"}
                  {r.provinceName ? ` · ${r.provinceName}` : null}
                </TableCell>
                <TableCell className="text-xs">
                  {r.isVerified ? (
                    <Badge
                      variant="secondary"
                      className="bg-emerald-700/15 text-emerald-800 dark:text-emerald-400"
                    >
                      Full time
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="bg-red-600/15 text-red-800 dark:text-red-300"
                    >
                      Non-verified
                    </Badge>
                  )}
                  <br />
                  <span className="text-muted-foreground">
                    {r.isVerified ? r.verificationLevel : "Non-verified"}
                  </span>
                </TableCell>
                <TableCell className="flex flex-col gap-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => openEdit(r)}>
                    Edit
                  </Button>
                  <LinkButton variant="ghost" size="sm" href={`/matches/${r.fixtureId}`}>
                    Public view
                  </LinkButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-2">
          {page > 1 ? (
            <LinkButton variant="outline" size="sm" href={scoresListHref(page - 1, initialSearch)}>
              Previous
            </LinkButton>
          ) : null}
          {page < totalPages ? (
            <LinkButton variant="outline" size="sm" href={scoresListHref(page + 1, initialSearch)}>
              Next
            </LinkButton>
          ) : null}
        </div>
        <Link href="/results" className="text-sm text-primary hover:underline">
          Open public results archive
        </Link>
      </div>

      <Dialog open={Boolean(editing)} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit score</DialogTitle>
          </DialogHeader>
          {editing ? (
            <div className="grid gap-3 py-2 text-sm">
              <p className="text-muted-foreground">
                {editing.homeSchoolName} vs {editing.awaySchoolName}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="homeScore">Home score</Label>
                  <Input
                    id="homeScore"
                    type="number"
                    min={0}
                    max={500}
                    value={editing.homeScore}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        homeScore: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="awayScore">Away score</Label>
                  <Input
                    id="awayScore"
                    type="number"
                    min={0}
                    max={500}
                    value={editing.awayScore}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        awayScore: Number(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="matchDate">Match date</Label>
                <Input
                  id="matchDate"
                  type="date"
                  value={editing.matchDate}
                  onChange={(e) => setEditing({ ...editing, matchDate: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="venue">Venue (optional)</Label>
                <Input
                  id="venue"
                  value={editing.venue ?? ""}
                  onChange={(e) => setEditing({ ...editing, venue: e.target.value || null })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="recordingUrl">Super Sports Schools recording (optional)</Label>
                <Input
                  id="recordingUrl"
                  type="url"
                  placeholder="https://…"
                  value={editing.recordingUrl ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      recordingUrl: e.target.value.trim() ? e.target.value.trim() : null,
                    })
                  }
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  id="isVerified"
                  type="checkbox"
                  className="size-4 rounded border"
                  checked={editing.isVerified}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setEditing({
                      ...editing,
                      isVerified: on,
                      verificationLevel: on
                        ? editing.verificationLevel === "SUBMITTED"
                          ? "MODERATOR_VERIFIED"
                          : editing.verificationLevel
                        : "SUBMITTED",
                    });
                  }}
                />
                <Label htmlFor="isVerified">Verified / visible on public site</Label>
              </div>
              <div className="space-y-1">
                <Label>Verification level</Label>
                <Select
                  value={editing.verificationLevel}
                  onValueChange={(v) => {
                    const next = v as AdminScoreRowSerialized["verificationLevel"];
                    // If admin selects "Non-verified" (stored as SUBMITTED), ensure we also flip isVerified off.
                    // Otherwise, SUBMITTED would still be saved as "verified" which is confusing.
                    if (next === "SUBMITTED") {
                      setEditing({
                        ...editing,
                        isVerified: false,
                        verificationLevel: "SUBMITTED",
                      });
                      return;
                    }
                    setEditing({
                      ...editing,
                      isVerified: true,
                      verificationLevel: next,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MODERATOR_VERIFIED">Moderator verified</SelectItem>
                    {verificationCap === "all" ? (
                      <SelectItem value="SOURCE_VERIFIED">Source verified</SelectItem>
                    ) : null}
                    <SelectItem value="SUBMITTED">Non-verified</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="button" disabled={pending} onClick={() => saveEdit()}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
