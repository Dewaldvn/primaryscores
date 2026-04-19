"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminScheduleLiveSessionAction } from "@/actions/admin-schedule-live";
import { SCHOOL_SPORTS, schoolSportLabel, type SchoolSport } from "@/lib/sports";

type SchoolHit = { id: string; displayName: string };
type TeamHit = { id: string; label: string; sport: SchoolSport; gender: string | null };

export function AdminScheduleLiveForm() {
  const router = useRouter();
  const [pending, start] = useTransition();

  const [sport, setSport] = useState<SchoolSport>("RUGBY");

  const [homeSchoolQ, setHomeSchoolQ] = useState("");
  const [homeSchoolHits, setHomeSchoolHits] = useState<SchoolHit[]>([]);
  const [homeSchool, setHomeSchool] = useState<SchoolHit | null>(null);
  const [homeTeamHits, setHomeTeamHits] = useState<TeamHit[]>([]);
  const [homeTeamPick, setHomeTeamPick] = useState("");
  const [homeTeamId, setHomeTeamId] = useState("");

  const [awaySchoolQ, setAwaySchoolQ] = useState("");
  const [awaySchoolHits, setAwaySchoolHits] = useState<SchoolHit[]>([]);
  const [awaySchool, setAwaySchool] = useState<SchoolHit | null>(null);
  const [awayTeamHits, setAwayTeamHits] = useState<TeamHit[]>([]);
  const [awayTeamPick, setAwayTeamPick] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");

  const [venue, setVenue] = useState("");
  const [goesLocal, setGoesLocal] = useState("");

  const homeTeamMeta = homeTeamHits.find((h) => h.id === homeTeamPick) ?? null;

  useEffect(() => {
    if (homeSchoolQ.trim().length < 2) {
      setHomeSchoolHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      void fetch(`/api/schools/search?q=${encodeURIComponent(homeSchoolQ.trim())}`)
        .then((r) => r.json() as Promise<SchoolHit[]>)
        .then((rows) => {
          if (!cancelled) setHomeSchoolHits(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          if (!cancelled) setHomeSchoolHits([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [homeSchoolQ]);

  useEffect(() => {
    if (awaySchoolQ.trim().length < 2) {
      setAwaySchoolHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      void fetch(`/api/schools/search?q=${encodeURIComponent(awaySchoolQ.trim())}`)
        .then((r) => r.json() as Promise<SchoolHit[]>)
        .then((rows) => {
          if (!cancelled) setAwaySchoolHits(Array.isArray(rows) ? rows : []);
        })
        .catch(() => {
          if (!cancelled) setAwaySchoolHits([]);
        });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [awaySchoolQ]);

  async function fetchTeamsForSchool(schoolId: string, role: "home" | "away") {
    const params = new URLSearchParams({ schoolId, sport });
    if (role === "away" && sport === "HOCKEY" && homeTeamMeta?.gender) {
      params.set("gender", homeTeamMeta.gender);
    }
    const res = await fetch(`/api/teams/by-school?${params.toString()}`, { cache: "no-store" });
    const rows = (await res.json()) as TeamHit[];
    const list = Array.isArray(rows) ? rows : [];
    if (role === "home") {
      setHomeTeamHits(list);
      setHomeTeamPick("");
      setHomeTeamId("");
    } else {
      setAwayTeamHits(list);
      setAwayTeamPick("");
      setAwayTeamId("");
    }
  }

  useEffect(() => {
    if (!homeSchool) return;
    void fetchTeamsForSchool(homeSchool.id, "home");
  }, [homeSchool, sport]);

  useEffect(() => {
    if (!awaySchool || !homeTeamPick) return;
    void fetchTeamsForSchool(awaySchool.id, "away");
  }, [awaySchool, sport, homeTeamPick, homeTeamMeta?.gender]);

  useEffect(() => {
    setHomeSchool(null);
    setHomeSchoolQ("");
    setHomeSchoolHits([]);
    setHomeTeamHits([]);
    setHomeTeamPick("");
    setHomeTeamId("");
    setAwaySchool(null);
    setAwaySchoolQ("");
    setAwaySchoolHits([]);
    setAwayTeamHits([]);
    setAwayTeamPick("");
    setAwayTeamId("");
  }, [sport]);

  useEffect(() => {
    if (!homeTeamPick) {
      setHomeTeamId("");
      return;
    }
    const hit = homeTeamHits.find((h) => h.id === homeTeamPick);
    setHomeTeamId(hit?.id ?? "");
  }, [homeTeamPick, homeTeamHits]);

  useEffect(() => {
    if (!awayTeamPick) {
      setAwayTeamId("");
      return;
    }
    const hit = awayTeamHits.find((h) => h.id === awayTeamPick);
    setAwayTeamId(hit?.id ?? "");
  }, [awayTeamPick, awayTeamHits]);

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
          toast.error("Choose sport, then home and away teams.");
          return;
        }
        const goesLiveAtIso = new Date(goesLocal).toISOString();
        start(async () => {
          const res = await adminScheduleLiveSessionAction({
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
        <Label htmlFor="admin-schedule-sport">Sport</Label>
        <select
          id="admin-schedule-sport"
          className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={sport}
          onChange={(e) => setSport(e.target.value as SchoolSport)}
          required
        >
          {SCHOOL_SPORTS.map((s) => (
            <option key={s} value={s}>
              {schoolSportLabel(s)}
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">
          Teams are filtered to this sport only (and matching hockey side when applicable).
        </p>
      </div>

      <div className="space-y-1">
        <Label htmlFor="home-school-search">Home — school search</Label>
        <Input
          id="home-school-search"
          value={homeSchoolQ}
          onChange={(e) => {
            setHomeSchoolQ(e.target.value);
            setHomeSchool(null);
            setHomeSchoolHits([]);
            setHomeTeamHits([]);
            setHomeTeamPick("");
            setHomeTeamId("");
          }}
          placeholder="Type school name…"
          autoComplete="off"
        />
        {homeSchoolHits.length > 0 ? (
          <ul className="max-h-40 overflow-y-auto rounded-md border bg-popover p-1">
            {homeSchoolHits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setHomeSchool(h);
                    setHomeSchoolQ(h.displayName);
                    setHomeSchoolHits([]);
                    setAwaySchool(null);
                    setAwaySchoolQ("");
                    setAwaySchoolHits([]);
                    setAwayTeamHits([]);
                    setAwayTeamPick("");
                    setAwayTeamId("");
                  }}
                >
                  {h.displayName}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {homeSchool ? (
          <>
            <Label htmlFor="home-team-pick">Home team · {schoolSportLabel(sport)}</Label>
            <select
              id="home-team-pick"
              className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={homeTeamPick}
              onChange={(e) => setHomeTeamPick(e.target.value)}
              required
            >
              <option value="">Choose team…</option>
              {homeTeamHits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="away-school-search">Away — school search</Label>
        <Input
          id="away-school-search"
          value={awaySchoolQ}
          onChange={(e) => {
            setAwaySchoolQ(e.target.value);
            setAwaySchool(null);
            setAwaySchoolHits([]);
            setAwayTeamHits([]);
            setAwayTeamPick("");
            setAwayTeamId("");
          }}
          placeholder={homeTeamPick ? "Type school name…" : "Select home team first"}
          disabled={!homeTeamPick}
          autoComplete="off"
        />
        {awaySchoolHits.length > 0 ? (
          <ul className="max-h-40 overflow-y-auto rounded-md border bg-popover p-1">
            {awaySchoolHits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                  onClick={() => {
                    setAwaySchool(h);
                    setAwaySchoolQ(h.displayName);
                    setAwaySchoolHits([]);
                  }}
                >
                  {h.displayName}
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {awaySchool && homeTeamPick ? (
          <>
            <Label htmlFor="away-team-pick">Away team · {schoolSportLabel(sport)}</Label>
            <select
              id="away-team-pick"
              className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={awayTeamPick}
              onChange={(e) => setAwayTeamPick(e.target.value)}
              required
            >
              <option value="">Choose team…</option>
              {awayTeamHits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      <div className="space-y-1">
        <Label htmlFor="admin-goes">Goes live (your local date &amp; time)</Label>
        <Input
          id="admin-goes"
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
        <Label htmlFor="admin-venue">Venue (optional)</Label>
        <Input id="admin-venue" value={venue} onChange={(e) => setVenue(e.target.value)} maxLength={300} />
      </div>

      <Button type="submit" disabled={pending || !awayTeamId}>
        {pending ? "Saving…" : "Create scoreboard"}
      </Button>
    </form>
  );
}
