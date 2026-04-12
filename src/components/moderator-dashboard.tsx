"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  createColumnHelper,
} from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { ModerationStatusBadge } from "@/components/verification-badge";
import {
  approveSubmissionAction,
  rejectSubmissionAction,
  flagNeedsReviewAction,
} from "@/actions/moderation";
import { defaultTeamIdFromSubmission } from "@/lib/moderation-defaults";
import { cn } from "@/lib/utils";
import { SuperSportsRecordingLink } from "@/components/super-sports-recording-link";

export type ModRow = {
  id: string;
  proposedHomeTeamName: string;
  proposedAwayTeamName: string;
  proposedHomeTeamId: string | null;
  proposedAwayTeamId: string | null;
  proposedSeasonId: string | null;
  proposedCompetitionId: string | null;
  proposedMatchDate: string;
  proposedHomeScore: number;
  proposedAwayScore: number;
  proposedVenue: string | null;
  moderationStatus: string;
  submittedAt: string;
  sourceUrl: string | null;
  recordingUrl: string | null;
  notes: string | null;
  submitterEmail: string | null;
};

export type ModTeamOpt = { teamId: string; label: string };
export type ModSeasonOpt = { id: string; label: string };
export type ModCompOpt = { id: string; label: string };

export function ModeratorDashboard({
  rows,
  teamOptions,
  seasonOptions,
  competitionOptions,
}: {
  rows: ModRow[];
  teamOptions: ModTeamOpt[];
  seasonOptions: ModSeasonOpt[];
  competitionOptions: ModCompOpt[];
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const columnHelper = createColumnHelper<ModRow>();

  const columns = useMemo(
    () => [
      columnHelper.accessor("submittedAt", {
        header: "Submitted",
        cell: (i) => format(new Date(i.getValue()), "dd MMM yyyy HH:mm"),
      }),
      columnHelper.accessor("proposedHomeTeamName", {
        header: "Fixture",
        cell: (i) => {
          const row = i.row.original;
          return (
            <div className="max-w-[220px] text-sm">
              <div className="font-medium">
                {row.proposedHomeTeamName} vs {row.proposedAwayTeamName}
              </div>
              <div className="text-muted-foreground">
                {row.proposedHomeScore}–{row.proposedAwayScore} ·{" "}
                {row.proposedMatchDate}
              </div>
            </div>
          );
        },
      }),
      columnHelper.accessor("moderationStatus", {
        header: "Status",
        cell: (i) => <ModerationStatusBadge status={i.getValue()} />,
      }),
      columnHelper.display({
        id: "actions",
        header: "",
        cell: (ctx) => (
          <ReviewDialog
            row={ctx.row.original}
            teamOptions={teamOptions}
            seasonOptions={seasonOptions}
            competitionOptions={competitionOptions}
            busyId={pendingId}
            setBusy={setPendingId}
          />
        ),
      }),
    ],
    [columnHelper, teamOptions, seasonOptions, competitionOptions, pendingId]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card>
      <CardHeader>
        <p className="text-sm text-muted-foreground">
          Recent activity: use filters in your workflow; table is sorted by submission time.
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  Queue is empty.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    (row.original.notes ?? "").startsWith("DISPUTE:") &&
                      "bg-orange-500/10 hover:bg-orange-500/15"
                  )}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ReviewDialog({
  row,
  teamOptions,
  seasonOptions,
  competitionOptions,
  busyId,
  setBusy,
}: {
  row: ModRow;
  teamOptions: ModTeamOpt[];
  seasonOptions: ModSeasonOpt[];
  competitionOptions: ModCompOpt[];
  busyId: string | null;
  setBusy: (id: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const homeTeamDefault = useMemo(
    () =>
      defaultTeamIdFromSubmission(
        row.proposedHomeTeamName,
        row.proposedHomeTeamId,
        teamOptions
      ),
    [row.proposedHomeTeamName, row.proposedHomeTeamId, teamOptions]
  );

  const awayTeamDefault = useMemo(
    () =>
      defaultTeamIdFromSubmission(
        row.proposedAwayTeamName,
        row.proposedAwayTeamId,
        teamOptions
      ),
    [row.proposedAwayTeamName, row.proposedAwayTeamId, teamOptions]
  );

  const seasonDefault = useMemo(() => {
    const id = row.proposedSeasonId;
    if (id && seasonOptions.some((s) => s.id === id)) return id;
    return "";
  }, [row.proposedSeasonId, seasonOptions]);

  const competitionDefault = useMemo(() => {
    const id = row.proposedCompetitionId;
    if (id && competitionOptions.some((c) => c.id === id)) return id;
    return "";
  }, [row.proposedCompetitionId, competitionOptions]);

  const [homeTeamSel, setHomeTeamSel] = useState("");
  const [awayTeamSel, setAwayTeamSel] = useState("");

  useLayoutEffect(() => {
    if (!open) return;
    setHomeTeamSel(homeTeamDefault);
    setAwayTeamSel(awayTeamDefault);
  }, [open, homeTeamDefault, awayTeamDefault]);

  function approveForm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(row.id);
    void (async () => {
      const vl = fd.get("verificationLevel");
      const res = await approveSubmissionAction({
        submissionId: row.id,
        homeTeamId: homeTeamSel,
        awayTeamId: awayTeamSel,
        seasonId: String(fd.get("seasonId") ?? ""),
        competitionId: String(fd.get("competitionId") ?? ""),
        matchDate: String(fd.get("matchDate")),
        homeScore: fd.get("homeScore"),
        awayScore: fd.get("awayScore"),
        venue: fd.get("venue") || null,
        verificationLevel:
          vl === "SOURCE_VERIFIED" ? "SOURCE_VERIFIED" : "MODERATOR_VERIFIED",
      });
      setBusy(null);
      if (!res.ok) {
        const err =
          "error" in res && res.error
            ? String(res.error)
            : "fieldErrors" in res && res.fieldErrors
              ? Object.values(res.fieldErrors).flat().join("; ") || "Validation failed"
              : "Could not approve";
        toast.error(err);
        return;
      }
      toast.success("Approved and published");
      setOpen(false);
      window.location.reload();
    })();
  }

  function reject() {
    setBusy(row.id);
    void (async () => {
      const res = await rejectSubmissionAction({
        submissionId: row.id,
        reason: rejectReason || "No reason provided",
      });
      setBusy(null);
      if (!res.ok) {
        toast.error("Reject failed");
        return;
      }
      toast.success("Rejected");
      setOpen(false);
      window.location.reload();
    })();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="secondary" />}>
        Review
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Moderate submission</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 text-sm">
          <p>
            <strong>{row.proposedHomeTeamName}</strong> vs{" "}
            <strong>{row.proposedAwayTeamName}</strong>
          </p>
          <p className="text-muted-foreground">
            Submitted {row.submittedAt}
            {row.submitterEmail ? ` · ${row.submitterEmail}` : ""}
          </p>
          <div className="flex flex-col gap-1">
            {row.recordingUrl ? (
              <SuperSportsRecordingLink href={row.recordingUrl} className="break-all text-xs">
                Super Sports Schools recording (submitted)
              </SuperSportsRecordingLink>
            ) : null}
            {row.sourceUrl ? (
              <a
                href={row.sourceUrl}
                className="break-all text-primary hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Source link
              </a>
            ) : null}
          </div>
          {row.notes ? (
            (row.notes ?? "").startsWith("DISPUTE:") ? (
              <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-3 text-xs text-foreground">
                {(() => {
                  const lines = row.notes.split(/\r?\n/);
                  const body = lines.slice(1).join("\n").trim();
                  const current = lines.find((l) => l.toLowerCase().startsWith("current score:"));
                  const claimed = lines.find((l) => l.toLowerCase().startsWith("claimed score:"));
                  const message = lines
                    .slice(1)
                    .filter((l) => !l.toLowerCase().startsWith("current score:") && !l.toLowerCase().startsWith("claimed score:"))
                    .join("\n")
                    .trim();

                  return (
                    <div className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-orange-900 dark:text-orange-100">
                        Dispute
                      </p>
                      {current || claimed ? (
                        <div className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[0.72rem] text-orange-950/90 dark:text-orange-50/90">
                          {current ? <span>{current}</span> : null}
                          {claimed ? <span>{claimed}</span> : null}
                        </div>
                      ) : null}
                      {message ? (
                        <p className="whitespace-pre-wrap rounded-md bg-background/60 p-2 text-[0.8rem] font-medium leading-relaxed text-foreground">
                          {message}
                        </p>
                      ) : body ? (
                        <p className="whitespace-pre-wrap rounded-md bg-background/60 p-2 text-[0.8rem] leading-relaxed text-foreground">
                          {body}
                        </p>
                      ) : null}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <p className="rounded bg-muted p-2 text-xs whitespace-pre-wrap">{row.notes}</p>
            )
          ) : null}
        </div>

        <form key={`approve-${row.id}`} onSubmit={approveForm} className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Approve & publish</p>
          <p className="text-xs text-muted-foreground">
            Teams default from the submission (IDs or closest school name match). Change the dropdown if the
            spelling differs.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Home team</Label>
              <select
                name="homeTeamId"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={homeTeamSel}
                onChange={(e) => setHomeTeamSel(e.target.value)}
              >
                <option value="">Select…</option>
                {teamOptions.map((t) => (
                  <option key={t.teamId} value={t.teamId}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Submitted: {row.proposedHomeTeamName}</p>
            </div>
            <div className="space-y-1">
              <Label>Away team</Label>
              <select
                name="awayTeamId"
                required
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                value={awayTeamSel}
                onChange={(e) => setAwayTeamSel(e.target.value)}
              >
                <option value="">Select…</option>
                {teamOptions.map((t) => (
                  <option key={`a-${t.teamId}`} value={t.teamId}>
                    {t.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Submitted: {row.proposedAwayTeamName}</p>
            </div>
            <div className="space-y-1">
              <Label>Season (optional)</Label>
              <select
                name="seasonId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                defaultValue={seasonDefault}
              >
                <option value="">Not set</option>
                {seasonOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Competition (optional)</Label>
              <select
                name="competitionId"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                defaultValue={competitionDefault}
              >
                <option value="">Not set</option>
                {competitionOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Match date</Label>
              <Input name="matchDate" type="date" required defaultValue={row.proposedMatchDate} />
            </div>
            <div className="space-y-1">
              <Label>Venue</Label>
              <Input name="venue" defaultValue={row.proposedVenue ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Home score</Label>
              <Input
                name="homeScore"
                type="number"
                required
                defaultValue={row.proposedHomeScore}
              />
            </div>
            <div className="space-y-1">
              <Label>Away score</Label>
              <Input
                name="awayScore"
                type="number"
                required
                defaultValue={row.proposedAwayScore}
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Verification level</Label>
              <select
                name="verificationLevel"
                required
                defaultValue="MODERATOR_VERIFIED"
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
              >
                <option value="MODERATOR_VERIFIED">Moderator verified</option>
                <option value="SOURCE_VERIFIED">Source verified</option>
              </select>
            </div>
          </div>
          <Button type="submit" disabled={busyId === row.id}>
            Approve
          </Button>
        </form>

        <div className="space-y-2 border-t pt-4">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void flagNeedsReviewAction(row.id).then(() => window.location.reload());
            }}
          >
            Flag needs review
          </Button>
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label>Reject with reason</Label>
          <Textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} rows={2} />
          <Button type="button" variant="destructive" size="sm" onClick={reject} disabled={busyId === row.id}>
            Reject
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
