"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { submitDisputeAction } from "@/actions/disputes";
import { registerAttachmentAction } from "@/actions/attachments";
import { createClient } from "@/lib/supabase/client";
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
import { Textarea } from "@/components/ui/textarea";
import { TurnstilePlaceholder } from "@/components/turnstile-placeholder";

export function DisputeScoreDialog({
  fixtureId,
  resultId,
  homeSchoolName,
  awaySchoolName,
  homeTeamLabel,
  awayTeamLabel,
  homeScore,
  awayScore,
  signedIn,
  loginRedirectTo,
}: {
  fixtureId: string;
  resultId: string;
  homeSchoolName: string;
  awaySchoolName: string;
  homeTeamLabel: string;
  awayTeamLabel: string;
  homeScore: number;
  awayScore: number;
  signedIn: boolean;
  loginRedirectTo: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [turnToken, setTurnToken] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [proposedHomeScore, setProposedHomeScore] = useState<number>(homeScore);
  const [proposedAwayScore, setProposedAwayScore] = useState<number>(awayScore);
  const [file, setFile] = useState<File | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);

  const title = useMemo(
    () => `Wait, I don't agree with this score`,
    []
  );

  function reset() {
    setMessage("");
    setProposedHomeScore(homeScore);
    setProposedAwayScore(awayScore);
    setFile(null);
    setTurnToken(null);
    setDoneId(null);
  }

  async function uploadEvidence(submissionId: string, f: File) {
    const supabase = createClient();
    const path = `submissions/${submissionId}/${Date.now()}-${f.name}`;
    const { error: upErr } = await supabase.storage.from("evidence").upload(path, f, {
      contentType: f.type || "application/octet-stream",
    });
    if (upErr) {
      toast.error("Dispute saved but upload failed. You can send evidence to a moderator.");
      return;
    }
    await registerAttachmentAction({
      submissionId,
      filePath: path,
      fileName: f.name,
      mimeType: f.type || "application/octet-stream",
    });
  }

  function submit() {
    if (!signedIn) {
      router.push(`/login?redirect=${encodeURIComponent(loginRedirectTo)}`);
      return;
    }

    start(async () => {
      const res = await submitDisputeAction({
        fixtureId,
        resultId,
        proposedHomeScore,
        proposedAwayScore,
        message,
        turnstileToken: turnToken,
      });

      if (!res.ok) {
        if ("fieldErrors" in res && res.fieldErrors) {
          toast.error("Please check the form fields.");
        } else if ("error" in res) {
          toast.error(res.error);
        } else {
          toast.error("Could not submit dispute.");
        }
        return;
      }

      if (file && file.size > 0) {
        await uploadEvidence(res.submissionId, file);
      }

      setDoneId(res.submissionId);
      toast.success("Dispute submitted for moderation.");
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <button
        type="button"
        className="pointer-events-auto text-xs text-primary underline-offset-4 hover:underline"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        {title}
      </button>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        {doneId ? (
          <div className="space-y-3 py-2 text-sm">
            <p className="text-muted-foreground">
              Thanks — your dispute was saved and will be reviewed by a moderator.
            </p>
            <p className="text-muted-foreground">
              Reference <span className="break-all font-mono text-xs">{doneId}</span>.
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                }}
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="grid gap-4 py-2 text-sm">
            <p className="text-muted-foreground">
              This will create a new moderation submission for{" "}
              <span className="font-medium text-foreground">
                {homeSchoolName} vs {awaySchoolName}
              </span>
              .
            </p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor={`dispute-home-${fixtureId}`}>
                  {homeSchoolName} — {homeTeamLabel}
                </Label>
                <Input
                  id={`dispute-home-${fixtureId}`}
                  type="number"
                  min={0}
                  max={500}
                  value={proposedHomeScore}
                  onChange={(e) => setProposedHomeScore(Number(e.target.value) || 0)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`dispute-away-${fixtureId}`}>
                  {awaySchoolName} — {awayTeamLabel}
                </Label>
                <Input
                  id={`dispute-away-${fixtureId}`}
                  type="number"
                  min={0}
                  max={500}
                  value={proposedAwayScore}
                  onChange={(e) => setProposedAwayScore(Number(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`dispute-message-${fixtureId}`}>What’s wrong with the current score? *</Label>
              <Textarea
                id={`dispute-message-${fixtureId}`}
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="E.g. We have the final score sheet and it was 18–12, not 12–18…"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`dispute-evidence-${fixtureId}`}>Evidence file (optional)</Label>
              <Input
                id={`dispute-evidence-${fixtureId}`}
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>

            <TurnstilePlaceholder onToken={setTurnToken} />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={pending} onClick={submit}>
                {pending ? "Submitting…" : signedIn ? "Submit dispute" : "Sign in to dispute"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

