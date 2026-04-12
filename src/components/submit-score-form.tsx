"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LinkButton } from "@/components/link-button";
import { TurnstilePlaceholder } from "@/components/turnstile-placeholder";
import { submitScoreAction } from "@/actions/submissions";
import { registerAttachmentAction } from "@/actions/attachments";
import { createClient } from "@/lib/supabase/client";
import { SchoolLogo } from "@/components/school-logo";

type SchoolHit = {
  id: string;
  displayName: string;
  slug: string;
  town: string | null;
  provinceName: string;
  logoPath: string | null;
  u13TeamId: string | null;
};

export function SubmitScoreForm({
  seasons: seasonRows,
  competitions: compRows,
  provinces: provinceRows,
}: {
  seasons: { id: string; name: string; year: number }[];
  competitions: { id: string; name: string; provinceName: string | null }[];
  provinces: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [done, setDone] = useState<{
    submissionId: string;
    duplicateWarning: boolean;
  } | null>(null);
  const [turnToken, setTurnToken] = useState<string | null>(null);
  const [homeQ, setHomeQ] = useState("");
  const [awayQ, setAwayQ] = useState("");
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");
  const [homeHits, setHomeHits] = useState<SchoolHit[]>([]);
  const [awayHits, setAwayHits] = useState<SchoolHit[]>([]);
  const [homeTeamId, setHomeTeamId] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");

  const seasonOptions = useMemo(() => seasonRows, [seasonRows]);
  const provinceOptions = useMemo(() => provinceRows, [provinceRows]);

  async function searchSchools(q: string, side: "home" | "away") {
    if (q.trim().length < 2) {
      if (side === "home") setHomeHits([]);
      else setAwayHits([]);
      return;
    }
    const res = await fetch(`/api/schools/search?q=${encodeURIComponent(q)}`);
    const data = (await res.json()) as SchoolHit[];
    if (side === "home") setHomeHits(data);
    else setAwayHits(data);
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);

    start(async () => {
      const raw = {
        proposedMatchDate: String(fd.get("proposedMatchDate") ?? ""),
        proposedHomeTeamId: homeTeamId || undefined,
        proposedAwayTeamId: awayTeamId || undefined,
        proposedHomeTeamName: homeTeamName.trim(),
        proposedAwayTeamName: awayTeamName.trim(),
        proposedHomeScore: fd.get("proposedHomeScore"),
        proposedAwayScore: fd.get("proposedAwayScore"),
        proposedProvinceId: fd.get("proposedProvinceId") || undefined,
        proposedSeasonId: fd.get("proposedSeasonId") || undefined,
        proposedCompetitionId: fd.get("proposedCompetitionId") || undefined,
        proposedVenue: fd.get("proposedVenue") || undefined,
        recordingUrl: fd.get("recordingUrl") || undefined,
        sourceUrl: fd.get("sourceUrl") || undefined,
        notes: fd.get("notes") || undefined,
        turnstileToken: turnToken,
      };

      const res = await submitScoreAction(raw);
      if (!res.ok) {
        if ("fieldErrors" in res && res.fieldErrors) {
          toast.error("Check highlighted fields.");
          console.error(res.fieldErrors);
        } else if ("error" in res) toast.error(res.error);
        return;
      }

      const file = (fd.get("evidence") as File | null) && (fd.get("evidence") as File).size > 0
        ? (fd.get("evidence") as File)
        : null;

      if (file) {
        const supabase = createClient();
        const path = `submissions/${res.submissionId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage.from("evidence").upload(path, file, {
          contentType: file.type || "application/octet-stream",
        });
        if (upErr) {
          toast.error("Score saved but upload failed. You can send evidence to a moderator.");
        } else {
          await registerAttachmentAction({
            submissionId: res.submissionId,
            filePath: path,
            fileName: file.name,
            mimeType: file.type || "application/octet-stream",
          });
        }
      }

      setDone({
        submissionId: res.submissionId,
        duplicateWarning: res.duplicateWarning,
      });
    });
  }

  function handleSubmitAnother(e: React.MouseEvent<HTMLAnchorElement>) {
    e.preventDefault();
    setDone(null);
    router.refresh();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (done) {
    return (
      <Card className="border-primary/20 shadow-sm">
        <CardHeader className="text-center sm:text-left">
          <CardTitle className="text-xl sm:text-2xl">Thank you — we received your score</CardTitle>
          <CardDescription className="text-base">
            Your submission is saved and will stay pending until a moderator has reviewed it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            One of our moderators will assess your entry when they are on duty. They compare what you
            sent with our schools and fixtures, then either publish it as a verified result, ask for a
            bit more detail, or reject it if something does not check out. That usually takes a little
            time, so you do not need to resend the same match unless we ask.
          </p>
          <p>
            You can leave this page whenever you like — this message stays here until you start another
            submission. If we need anything else, we will use the details tied to your account.
          </p>
          {done.duplicateWarning ? (
            <p className="rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-amber-950 dark:text-amber-100">
              We flagged that this might overlap with another pending submission about the same match.
              Thanks for helping — a moderator will look at both and sort it out.
            </p>
          ) : null}
          <p className="text-foreground">
            <span className="font-medium text-foreground">Your reference ID</span>{" "}
            <span className="break-all font-mono text-xs tracking-tight">{done.submissionId}</span>
          </p>
          <p>
            See everything you have sent (and its status) on{" "}
            <Link
              href="/my-submissions"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              My submissions
            </Link>
            .
          </p>
        </CardContent>
        <CardFooter className="flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center sm:gap-4">
          <LinkButton href="/submit" onClick={handleSubmitAnother} className="w-full sm:w-auto">
            Submit another score
          </LinkButton>
          <LinkButton
            href="/my-submissions"
            variant="outline"
            className="w-full sm:w-auto"
          >
            View my submissions
          </LinkButton>
        </CardFooter>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="proposedMatchDate">Match date *</Label>
          <Input id="proposedMatchDate" name="proposedMatchDate" type="date" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="homeSearch">Home school search</Label>
          <Input
            id="homeSearch"
            value={homeQ}
            onChange={(e) => {
              const v = e.target.value;
              setHomeQ(v);
              setHomeTeamName(v);
              void searchSchools(v, "home");
            }}
            placeholder="Type to search or enter the name as it should appear…"
            autoComplete="off"
          />
          {homeHits.length > 0 && (
            <ul className="max-h-40 overflow-auto rounded border bg-popover text-sm shadow-md">
              {homeHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      setHomeQ(h.displayName);
                      setHomeTeamName(h.displayName);
                      setHomeTeamId(h.u13TeamId ?? "");
                      setHomeHits([]);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <SchoolLogo logoPath={h.logoPath} alt="" size="xs" />
                      {h.displayName}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {h.town} · {h.provinceName}
                      {!h.u13TeamId ? " · no U13 team id" : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Label htmlFor="proposedHomeTeamName">Home team / school name *</Label>
          <Input
            id="proposedHomeTeamName"
            name="proposedHomeTeamName"
            required
            value={homeTeamName}
            onChange={(e) => setHomeTeamName(e.target.value)}
            placeholder="Same as search above, or edit after picking from the list"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="awaySearch">Away school search</Label>
          <Input
            id="awaySearch"
            value={awayQ}
            onChange={(e) => {
              const v = e.target.value;
              setAwayQ(v);
              setAwayTeamName(v);
              void searchSchools(v, "away");
            }}
            placeholder="Type to search or enter the name as it should appear…"
            autoComplete="off"
          />
          {awayHits.length > 0 && (
            <ul className="max-h-40 overflow-auto rounded border bg-popover text-sm shadow-md">
              {awayHits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left hover:bg-muted"
                    onClick={() => {
                      setAwayQ(h.displayName);
                      setAwayTeamName(h.displayName);
                      setAwayTeamId(h.u13TeamId ?? "");
                      setAwayHits([]);
                    }}
                  >
                    <span className="flex items-center gap-2">
                      <SchoolLogo logoPath={h.logoPath} alt="" size="xs" />
                      {h.displayName}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {h.town} · {h.provinceName}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Label htmlFor="proposedAwayTeamName">Away team / school name *</Label>
          <Input
            id="proposedAwayTeamName"
            name="proposedAwayTeamName"
            required
            value={awayTeamName}
            onChange={(e) => setAwayTeamName(e.target.value)}
            placeholder="Same as search above, or edit after picking from the list"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proposedHomeScore">Home score *</Label>
          <Input
            id="proposedHomeScore"
            name="proposedHomeScore"
            type="number"
            min={0}
            max={200}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proposedAwayScore">Away score *</Label>
          <Input
            id="proposedAwayScore"
            name="proposedAwayScore"
            type="number"
            min={0}
            max={200}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proposedProvinceId">Province</Label>
          <select
            id="proposedProvinceId"
            name="proposedProvinceId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            defaultValue=""
          >
            <option value="">Select…</option>
            {provinceOptions.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="proposedSeasonId">Season</Label>
          <select
            id="proposedSeasonId"
            name="proposedSeasonId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            defaultValue=""
          >
            <option value="">Unknown</option>
            {seasonOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.year})
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="proposedCompetitionId">Competition (if known)</Label>
          <select
            id="proposedCompetitionId"
            name="proposedCompetitionId"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
            defaultValue=""
          >
            <option value="">Unknown</option>
            {compRows.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.provinceName ? ` · ${c.provinceName}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="proposedVenue">Venue (optional)</Label>
          <Input id="proposedVenue" name="proposedVenue" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="recordingUrl">Super Sports Schools recording (optional)</Label>
          <Input
            id="recordingUrl"
            name="recordingUrl"
            type="url"
            placeholder="https://supersportschools.co.za/…"
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="sourceUrl">Source URL (optional)</Label>
          <Input id="sourceUrl" name="sourceUrl" type="url" placeholder="https://…" />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="notes">Notes for moderators (optional)</Label>
          <Textarea id="notes" name="notes" rows={3} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="evidence">Evidence file (optional)</Label>
          <Input id="evidence" name="evidence" type="file" accept="image/*,.pdf" />
        </div>
      </div>

      <TurnstilePlaceholder onToken={setTurnToken} />

      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Submitting…" : "Submit for review"}
      </Button>
    </form>
  );
}
