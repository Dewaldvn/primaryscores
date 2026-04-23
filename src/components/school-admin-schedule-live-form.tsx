"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { schoolAdminScheduleLiveSessionAction } from "@/actions/school-admin-live";
import type { SchoolSport } from "@/lib/sports";

type TeamOpt = {
  id: string;
  label: string;
  schoolId: string;
  schoolName: string;
  sport: SchoolSport;
  ageGroup: string;
  gender: string | null;
};

type SchoolHit = { id: string; displayName: string };
type TeamHit = { id: string; label: string; sport: SchoolSport; ageGroup: string; gender: string | null };

export function SchoolAdminScheduleLiveForm({
  homeTeamOptions,
  seasonOptions,
  competitionOptions,
}: {
  homeTeamOptions: TeamOpt[];
  seasonOptions: { id: string; label: string }[];
  competitionOptions: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [homeTeamId, setHomeTeamId] = useState(homeTeamOptions[0]?.id ?? "");
  const [homeQ, setHomeQ] = useState("");
  const [awayTeamId, setAwayTeamId] = useState("");
  const [awayLabel, setAwayLabel] = useState("");
  const [awaySchoolQ, setAwaySchoolQ] = useState("");
  const [awaySchoolHits, setAwaySchoolHits] = useState<SchoolHit[]>([]);
  const [awaySchool, setAwaySchool] = useState<SchoolHit | null>(null);
  const [awayTeamHits, setAwayTeamHits] = useState<TeamHit[]>([]);
  const [awayTeamPick, setAwayTeamPick] = useState("");
  const [venue, setVenue] = useState("");
  const [seasonId, setSeasonId] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const [goesLocal, setGoesLocal] = useState("");

  const selectedHome = homeTeamOptions.find((o) => o.id === homeTeamId) ?? null;
  const filteredHome = homeQ.trim()
    ? homeTeamOptions.filter((o) => o.label.toLowerCase().includes(homeQ.trim().toLowerCase()))
    : homeTeamOptions;
  const schoolLinks = Array.from(
    new Map(homeTeamOptions.map((o) => [o.schoolId, { schoolId: o.schoolId, schoolName: o.schoolName }])).values()
  );

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

  async function loadAwayTeamsForSchool(
    schoolId: string,
    sport: SchoolSport,
    ageGroup: string,
    hockeyGender: string | null | undefined
  ) {
    const params = new URLSearchParams({ schoolId, sport, ageGroup });
    if (sport === "HOCKEY" && hockeyGender) {
      params.set("gender", hockeyGender);
    }
    const res = await fetch(`/api/teams/by-school?${params.toString()}`, {
      cache: "no-store",
    });
    const rows = (await res.json()) as TeamHit[];
    setAwayTeamHits(Array.isArray(rows) ? rows : []);
    setAwayTeamId("");
    setAwayLabel("");
    setAwayTeamPick("");
  }

  useEffect(() => {
    if (!awaySchool || !homeTeamId) return;
    const home = homeTeamOptions.find((o) => o.id === homeTeamId);
    if (!home) return;
    void loadAwayTeamsForSchool(
      awaySchool.id,
      home.sport,
      home.ageGroup,
      home.sport === "HOCKEY" ? home.gender : null
    );
  }, [awaySchool, homeTeamId, homeTeamOptions]);

  useEffect(() => {
    if (!awayTeamPick) return;
    const hit = awayTeamHits.find((h) => h.id === awayTeamPick);
    if (!hit) return;
    setAwayTeamId(hit.id);
    setAwayLabel(awaySchool ? `${awaySchool.displayName} · ${hit.label}` : hit.label);
  }, [awayTeamPick, awayTeamHits, awaySchool]);

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
            seasonId: seasonId || null,
            competitionId: competitionId || null,
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
        <Input
          value={homeQ}
          onChange={(e) => setHomeQ(e.target.value)}
          placeholder="Search your team list…"
          autoComplete="off"
        />
        <select
          className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={homeTeamId}
          onChange={(e) => setHomeTeamId(e.target.value)}
          required
        >
          {filteredHome.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        {filteredHome.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            No matching home team found. Add the missing team first, then return here.
          </p>
        ) : null}
        {selectedHome ? (
          <p className="text-xs text-muted-foreground">
            Selected school: {selectedHome.schoolName} ·{" "}
            <a
              href={`/school-admin/teams/new?schoolId=${selectedHome.schoolId}`}
              className="text-primary underline"
            >
              Add team for this school
            </a>
          </p>
        ) : null}
        {!selectedHome && schoolLinks.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-1 text-xs">
            {schoolLinks.map((s) => (
              <a
                key={s.schoolId}
                href={`/school-admin/teams/new?schoolId=${s.schoolId}`}
                className="text-primary underline"
              >
                Add team: {s.schoolName}
              </a>
            ))}
          </div>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="away-school-search">Away school (search)</Label>
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
            setAwayLabel("");
          }}
          placeholder="Type school name…"
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
        {!awaySchool && awaySchoolQ.trim().length >= 2 && awaySchoolHits.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            School not found.{" "}
            <a
              href={`/add-team?q=${encodeURIComponent(awaySchoolQ.trim())}&prefillName=${encodeURIComponent(awaySchoolQ.trim())}`}
              className="text-primary underline"
            >
              Add a school or team
            </a>
          </p>
        ) : null}

        {awaySchool ? (
          <>
            <Label htmlFor="away-team-pick">Away team</Label>
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
            <p className="text-xs text-muted-foreground">
              Missing team?{" "}
              <a href={`/add-team?q=${encodeURIComponent(awaySchool.displayName)}`} className="text-primary underline">
                Add a school or team
              </a>
            </p>
          </>
        ) : null}
        {awayTeamId && awayLabel ? (
          <p className="text-xs text-muted-foreground">Away: {awayLabel}</p>
        ) : null}
      </div>
      <div className="space-y-1">
        <Label htmlFor="school-admin-season">Season (optional)</Label>
        <select
          id="school-admin-season"
          className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={seasonId}
          onChange={(e) => setSeasonId(e.target.value)}
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
        <Label htmlFor="school-admin-competition">Competition (optional)</Label>
        <select
          id="school-admin-competition"
          className="flex h-10 w-full rounded-md border border-input bg-background px-2 text-sm"
          value={competitionId}
          onChange={(e) => setCompetitionId(e.target.value)}
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
