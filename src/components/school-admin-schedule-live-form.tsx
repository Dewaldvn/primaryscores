"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { schoolAdminScheduleLiveSessionAction } from "@/actions/school-admin-live";

type TeamOpt = { id: string; label: string };

type AwayHit = { id: string; label: string };

export function SchoolAdminScheduleLiveForm({ homeTeamOptions }: { homeTeamOptions: TeamOpt[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [homeTeamId, setHomeTeamId] = useState(homeTeamOptions[0]?.id ?? "");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [awayLabel, setAwayLabel] = useState("");
  const [awayHits, setAwayHits] = useState<AwayHit[]>([]);
  const [awayQ, setAwayQ] = useState("");
  const [debouncedAway, setDebouncedAway] = useState("");
  const [venue, setVenue] = useState("");
  const [goesLocal, setGoesLocal] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAway(awayQ.trim()), 300);
    return () => clearTimeout(t);
  }, [awayQ]);

  useEffect(() => {
    if (debouncedAway.length < 2) {
      setAwayHits([]);
      return;
    }
    let cancelled = false;
    void fetch(`/api/teams/search?q=${encodeURIComponent(debouncedAway)}`)
      .then((r) => r.json() as Promise<AwayHit[]>)
      .then((rows) => {
        if (!cancelled) setAwayHits(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setAwayHits([]);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedAway]);

  useEffect(() => {
    if (goesLocal) return;
    const d = new Date();
    d.setMinutes(d.getMinutes() + 5);
    d.setSeconds(0, 0);
    const pad = (n: number) => String(n).padStart(2, "0");
    const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    setGoesLocal(local);
  }, [goesLocal]);

  return (
    <form
      className="grid max-w-lg gap-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        if (!homeTeamId || !awayTeamId) {
          toast.error("Choose home and away teams.");
          return;
        }
        const goesLiveAtIso = new Date(goesLocal).toISOString();
        start(async () => {
          const res = await schoolAdminScheduleLiveSessionAction({
            homeTeamId,
            awayTeamId,
            venue: venue.trim() || null,
            goesLiveAtIso,
          });
          if (!res.ok) {
            if ("fieldErrors" in res && res.fieldErrors) toast.error("Check the form.");
            else if ("error" in res) toast.error(res.error);
            else toast.error("Could not schedule.");
            return;
          }
          toast.success(res.scheduled ? "Live game scheduled." : "Live scoreboard opened.");
          router.push(`/live/${res.sessionId}`);
          router.refresh();
        });
      }}
    >
      <div className="space-y-1">
        <Label>Home team (your school)</Label>
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={homeTeamId}
          onChange={(e) => setHomeTeamId(e.target.value)}
          required
        >
          {homeTeamOptions.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="away-search">Away team (search)</Label>
        <Input
          id="away-search"
          value={awayQ}
          onChange={(e) => setAwayQ(e.target.value)}
          placeholder="Type school or team name…"
          autoComplete="off"
        />
        {awayHits.length > 0 ? (
          <ul className="max-h-48 overflow-y-auto rounded-md border bg-popover p-1">
            {awayHits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setAwayTeamId(h.id);
                    setAwayLabel(h.label);
                    setAwayQ(h.label);
                    setAwayHits([]);
                  }}
                >
                  {h.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {awayTeamId && awayLabel ? (
          <p className="text-xs text-muted-foreground">Away: {awayLabel}</p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="goes">Goes live (your local date &amp; time)</Label>
        <Input
          id="goes"
          type="datetime-local"
          value={goesLocal}
          onChange={(e) => setGoesLocal(e.target.value)}
          required
        />
        <p className="text-xs text-muted-foreground">
          Within about 2 minutes from now opens the board immediately; later times stay scheduled until then.
        </p>
      </div>
      <div className="space-y-1">
        <Label htmlFor="venue">Venue (optional)</Label>
        <Input id="venue" value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={300} />
      </div>
      <Button type="submit" disabled={pending || !awayTeamId}>
        {pending ? "Saving…" : "Create scoreboard"}
      </Button>
    </form>
  );
}
