"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  const [done, setDone] = useState<string | null>(null);
  const [turnToken, setTurnToken] = useState<string | null>(null);
  const [homeQ, setHomeQ] = useState("");
  const [awayQ, setAwayQ] = useState("");
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
        proposedHomeTeamName: String(fd.get("proposedHomeTeamName") ?? ""),
        proposedAwayTeamName: String(fd.get("proposedAwayTeamName") ?? ""),
        proposedHomeScore: fd.get("proposedHomeScore"),
        proposedAwayScore: fd.get("proposedAwayScore"),
        proposedProvinceId: fd.get("proposedProvinceId") || undefined,
        proposedSeasonId: fd.get("proposedSeasonId") || undefined,
        proposedCompetitionId: fd.get("proposedCompetitionId") || undefined,
        proposedVenue: fd.get("proposedVenue") || undefined,
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

      if (res.duplicateWarning) {
        toast.message(
          "Submitted — we flagged a possible duplicate pending review. Thanks for helping."
        );
      } else {
        toast.success("Score submitted for moderation.");
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

      setDone(res.submissionId);
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="rounded-lg border bg-muted/40 p-6 text-center">
        <h2 className="text-lg font-semibold">Thank you</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Reference <span className="font-mono text-xs">{done}</span>. Moderators will review your submission.
        </p>
        <Button className="mt-4" variant="outline" onClick={() => setDone(null)}>
          Submit another
        </Button>
      </div>
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
              setHomeQ(e.target.value);
              void searchSchools(e.target.value, "home");
            }}
            placeholder="Type to search…"
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
                      setHomeTeamId(h.u13TeamId ?? "");
                      (
                        document.getElementById(
                          "proposedHomeTeamName"
                        ) as HTMLInputElement
                      ).value = h.displayName;
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
          <Input id="proposedHomeTeamName" name="proposedHomeTeamName" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="awaySearch">Away school search</Label>
          <Input
            id="awaySearch"
            value={awayQ}
            onChange={(e) => {
              setAwayQ(e.target.value);
              void searchSchools(e.target.value, "away");
            }}
            placeholder="Type to search…"
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
                      setAwayTeamId(h.u13TeamId ?? "");
                      (
                        document.getElementById(
                          "proposedAwayTeamName"
                        ) as HTMLInputElement
                      ).value = h.displayName;
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
          <Input id="proposedAwayTeamName" name="proposedAwayTeamName" required />
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
