"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolLogo } from "@/components/school-logo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TurnstilePlaceholder } from "@/components/turnstile-placeholder";
import { createLiveSessionAction } from "@/actions/live-scores";
import { cn } from "@/lib/utils";
import { SCORE_RESULT_FRAME_CLASS } from "@/lib/score-result-frame";
import { ScoreCardSportIcons } from "@/components/score-card-sport-icons";
import { sameAgeGroupBand } from "@/lib/age-group-match";
import { LIVE_AUTO_SUBMIT_AFTER_MIN, LIVE_WRAPUP_AFTER_MIN } from "@/lib/live-constants";
import type { LiveSessionClientRow, LiveSessionMajority } from "@/lib/live-session-types";
import type { SchoolSport } from "@/lib/sports";
import { SCHOOL_SPORTS, schoolSportLabel } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";
import { TEAM_GENDERS, teamGenderLabel } from "@/lib/team-gender";

const POLL_MS = 15_000;
const LIST_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 350;

type SchoolHit = {
  id: string;
  displayName: string;
  logoPath: string | null;
};

type TeamOption = {
  id: string;
  label: string;
  sport: SchoolSport;
  ageGroup: string;
  teamLabel: string;
  gender: TeamGender | null;
};

type LiveScheduleOption = { id: string; sport: SchoolSport; label: string };

export function GamesUnderway({
  signedIn,
  startImageAbove = false,
  sportFilter,
  seasonOptions = [],
  competitionOptions = [],
}: {
  signedIn: boolean;
  /** When true (live hub), show start_live_game.png above the list; signed-out image links to login. */
  startImageAbove?: boolean;
  /** When set, list and new sessions are scoped to this sport (`?sport=` on the live page). */
  sportFilter?: SchoolSport;
  /** For “Start a live game” — optional season/competition, filtered by selected sport. */
  seasonOptions?: LiveScheduleOption[];
  competitionOptions?: LiveScheduleOption[];
}) {
  const livePath = sportFilter ? `/live?sport=${sportFilter}` : "/live";
  const loginHref = `/login?redirect=${encodeURIComponent(livePath)}`;

  const [sessions, setSessions] = useState<LiveSessionClientRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [openNew, setOpenNew] = useState(false);
  const [turnCreate, setTurnCreate] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === "") {
      setDebouncedSearch("");
      return;
    }
    const t = window.setTimeout(() => setDebouncedSearch(trimmed), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const refresh = useCallback(async () => {
    try {
      const q = debouncedSearch ? `&q=${encodeURIComponent(debouncedSearch)}` : "";
      const sportQ = sportFilter ? `&sport=${encodeURIComponent(sportFilter)}` : "";
      const res = await fetch(`/api/live-sessions?limit=${LIST_LIMIT}${q}${sportQ}`, { cache: "no-store" });
      const data = (await res.json()) as { sessions?: LiveSessionClientRow[]; error?: string };
      if (!res.ok) {
        setSessions([]);
        setLoadErr(
          data.error === "failed"
            ? "Could not load live games (server error). If this persists, check that database migrations are applied."
            : "Could not load live games."
        );
        return;
      }
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      setLoadErr(null);
    } catch {
      setLoadErr("Could not load live games.");
    }
  }, [debouncedSearch, sportFilter]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  const startLiveImageSrc =
    sportFilter === "HOCKEY"
      ? "/brand/start_live_game_hockey.png"
      : sportFilter === "NETBALL"
        ? "/brand/start_live_game_netball.png"
        : sportFilter === "SOCCER"
          ? "/brand/start_live_game_soccer.png"
          : "/brand/start_live_game.png";

  const startLiveImage = (
    <Image
      src={startLiveImageSrc}
      alt="Start a live game"
      width={420}
      height={220}
      className="h-auto max-w-[min(100%,460px)] w-full"
      priority={startImageAbove}
    />
  );

  const newGameDialog = (
    <DialogContent className="max-h-[90vh] overflow-y-auto text-center sm:max-w-md">
      <DialogHeader className="text-center sm:text-center">
        <DialogTitle>Start a live game</DialogTitle>
      </DialogHeader>
      <NewLiveGameForm
        hubSport={sportFilter}
        seasonOptions={seasonOptions}
        competitionOptions={competitionOptions}
        turnToken={turnCreate}
        onToken={setTurnCreate}
        onDone={() => {
          setOpenNew(false);
          setTurnCreate(null);
          void refresh();
        }}
      />
    </DialogContent>
  );

  return (
    <section className="space-y-4">
      {signedIn ? (
        <Dialog open={openNew} onOpenChange={setOpenNew}>
          {startImageAbove ? (
            <div className="mb-2 flex justify-center sm:mb-4">
              <DialogTrigger
                render={
                  <button
                    type="button"
                    className="rounded-lg ring-offset-background transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                }
              >
                {startLiveImage}
              </DialogTrigger>
            </div>
          ) : null}
          <div
            className={
              startImageAbove
                ? "flex flex-col gap-3"
                : "flex flex-col justify-between gap-3 sm:flex-row sm:items-end"
            }
          >
            <div>
              <h2 className="text-lg font-semibold">Games underway</h2>
              <p className="text-sm text-muted-foreground">
                Only the {LIST_LIMIT} most recently started open games are listed here (not every active game). Use search
                to find a school, or open a game from its share link. Tap a card for the full scoreboard. Majority view
                refreshes every {POLL_MS / 1000}s. After {LIVE_WRAPUP_AFTER_MIN} minutes you can send the result for
                moderation; after {LIVE_AUTO_SUBMIT_AFTER_MIN} minutes a submission is created automatically if no one does.
              </p>
            </div>
            {!startImageAbove ? (
              <DialogTrigger render={<Button variant="default" size="sm" />}>Start live game</DialogTrigger>
            ) : null}
          </div>
          {newGameDialog}
        </Dialog>
      ) : (
        <>
          {startImageAbove ? (
            <div className="mb-2 flex justify-center sm:mb-4">
              <Link
                href={loginHref}
                className="inline-block rounded-lg ring-offset-background transition-opacity hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {startLiveImage}
              </Link>
            </div>
          ) : null}
          <div
            className={
              startImageAbove
                ? "flex flex-col gap-3"
                : "flex flex-col justify-between gap-3 sm:flex-row sm:items-end"
            }
          >
            <div>
              <h2 className="text-lg font-semibold">Games underway</h2>
              <p className="text-sm text-muted-foreground">
                Only the {LIST_LIMIT} most recently started open games are listed here (not every active game). Use search
                to find a school, or open a game from its share link. Tap a card for the full scoreboard. Majority view
                refreshes every {POLL_MS / 1000}s. After {LIVE_WRAPUP_AFTER_MIN} minutes you can send the result for
                moderation; after {LIVE_AUTO_SUBMIT_AFTER_MIN} minutes a submission is created automatically if no one does.
              </p>
            </div>
            {!startImageAbove ? (
              <LinkButton href={loginHref} variant="default" size="sm">
                Sign in to start a live game
              </LinkButton>
            ) : null}
          </div>
        </>
      )}

      <div className="max-w-md space-y-1.5">
        <Label htmlFor="live-games-search" className="text-muted-foreground">
          Search live games
        </Label>
        <Input
          id="live-games-search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="School or team name…"
          autoComplete="off"
        />
      </div>

      {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}

      {sessions.length === 0 ? (
        <Card className={SCORE_RESULT_FRAME_CLASS}>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {debouncedSearch
              ? "No live games match your search."
              : "No live games right now."}
            {!debouncedSearch && signedIn
              ? " Start one when a match kicks off."
              : !debouncedSearch
                ? " Sign in to start a live game when a match kicks off."
                : null}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <CompactLiveSessionCard session={s} showSportBadge={!sportFilter} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CompactLiveSessionCard({
  session: s,
  showSportBadge = false,
}: {
  session: LiveSessionClientRow;
  showSportBadge?: boolean;
}) {
  const majority: LiveSessionMajority = s.majority;
  return (
    <Link
      href={`/live/${s.id}`}
      className="block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <Card
        className={cn(
          SCORE_RESULT_FRAME_CLASS,
          "relative h-full overflow-hidden transition-colors hover:bg-muted/50"
        )}
      >
        <ScoreCardSportIcons sport={s.sport} teamGender={s.teamGender} />
        <CardHeader className="pb-2 pt-4 text-center">
          {showSportBadge ? (
            <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {schoolSportLabel(s.sport)}
            </p>
          ) : null}
          <CardTitle className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm font-medium leading-snug">
            <span className="inline-flex max-w-full items-center justify-center gap-1.5">
              {s.homeLogoPath ? (
                <SchoolLogo logoPath={s.homeLogoPath} alt="" size="sm" className="shrink-0" />
              ) : null}
              <span className="min-w-0 break-words">{s.homeTeamName}</span>
            </span>
            <span className="shrink-0 text-muted-foreground">vs</span>
            <span className="inline-flex max-w-full items-center justify-center gap-1.5">
              {s.awayLogoPath ? (
                <SchoolLogo logoPath={s.awayLogoPath} alt="" size="sm" className="shrink-0" />
              ) : null}
              <span className="min-w-0 break-words">{s.awayTeamName}</span>
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-8 pt-0 text-center">
          <p className="font-mono text-3xl font-semibold tabular-nums sm:text-4xl">
            {majority ? (
              <>
                {majority.homeScore} – {majority.awayScore}
              </>
            ) : (
              <span className="text-lg text-muted-foreground">No score yet</span>
            )}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">Open for voting, wrap-up &amp; share</p>
        </CardContent>
      </Card>
    </Link>
  );
}

/** Two-step live picker: select school first, then select a team linked to that school. */
function useLiveSchoolTeamField(
  schoolSport: SchoolSport,
  hockeySearchGender?: TeamGender,
  ageGroupFilter?: string,
) {
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolHits, setSchoolHits] = useState<SchoolHit[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<SchoolHit | null>(null);
  const [teamOptions, setTeamOptions] = useState<TeamOption[]>([]);
  const [teamId, setTeamId] = useState("");
  const [teamLabel, setTeamLabel] = useState("");

  useEffect(() => {
    setSchoolHits([]);
    setSelectedSchool(null);
    setTeamOptions([]);
    setTeamId("");
    setTeamLabel("");
    setSchoolQuery("");
  }, [schoolSport, hockeySearchGender, ageGroupFilter]);

  async function fetchSchoolHits(q: string) {
    if (q.trim().length < 2) {
      setSchoolHits([]);
      return;
    }
    if (schoolSport === "HOCKEY" && hockeySearchGender === undefined) {
      setSchoolHits([]);
      return;
    }
    const genderQ =
      schoolSport === "HOCKEY" && hockeySearchGender
        ? `&gender=${encodeURIComponent(hockeySearchGender)}`
        : "";
    const res = await fetch(
      `/api/schools/search?q=${encodeURIComponent(q)}&sport=${encodeURIComponent(schoolSport)}${genderQ}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as unknown;
    const rows = Array.isArray(data) ? (data as SchoolHit[]) : [];
    setSchoolHits(rows);
  }

  async function loadTeamsForSchool(school: SchoolHit) {
    const ageQ = ageGroupFilter ? `&ageGroup=${encodeURIComponent(ageGroupFilter)}` : "";
    const genderQ =
      schoolSport === "HOCKEY" && hockeySearchGender
        ? `&gender=${encodeURIComponent(hockeySearchGender)}`
        : "";
    const res = await fetch(
      `/api/teams/by-school?schoolId=${encodeURIComponent(school.id)}&sport=${encodeURIComponent(schoolSport)}${genderQ}${ageQ}`,
      { cache: "no-store" }
    );
    const data = (await res.json()) as unknown;
    const rows = Array.isArray(data) ? (data as TeamOption[]) : [];
    setTeamOptions(rows);
    setTeamId("");
    setTeamLabel("");
  }

  function onSchoolInputChange(v: string) {
    setSchoolQuery(v);
    setSelectedSchool(null);
    setTeamOptions([]);
    setTeamId("");
    setTeamLabel("");
  }

  function chooseSchool(school: SchoolHit) {
    setSchoolQuery(school.displayName);
    setSelectedSchool(school);
    setSchoolHits([]);
    void loadTeamsForSchool(school);
  }

  function chooseTeam(nextTeamId: string) {
    setTeamId(nextTeamId);
    const team = teamOptions.find((t) => t.id === nextTeamId);
    setTeamLabel(team ? `${selectedSchool?.displayName ?? ""} · ${team.label}` : "");
  }

  return {
    schoolQuery,
    schoolHits,
    selectedSchool,
    teamOptions,
    teamId,
    teamLabel,
    selectedTeam: teamOptions.find((t) => t.id === teamId) ?? null,
    onSchoolInputChange,
    fetchSchoolHits,
    chooseSchool,
    chooseTeam,
  };
}

function LiveSchoolTeamField({
  idPrefix,
  schoolLabel,
  teamLabelText,
  field,
}: {
  idPrefix: string;
  schoolLabel: string;
  teamLabelText: string;
  field: ReturnType<typeof useLiveSchoolTeamField>;
}) {
  const addSchoolHref = field.schoolQuery.trim()
    ? `/add-team?q=${encodeURIComponent(field.schoolQuery)}&prefillName=${encodeURIComponent(field.schoolQuery)}`
    : "/add-team";
  const addTeamHref = field.selectedSchool
    ? `/add-team?q=${encodeURIComponent(field.selectedSchool.displayName)}`
    : addSchoolHref;

  return (
    <div className="space-y-2 text-left">
      <Label htmlFor={`${idPrefix}-school`}>{schoolLabel}</Label>
      <Input
        id={`${idPrefix}-school`}
        value={field.schoolQuery}
        onChange={(e) => {
          const v = e.target.value;
          field.onSchoolInputChange(v);
          void field.fetchSchoolHits(v);
        }}
        placeholder="Search schools..."
        autoComplete="off"
        required
        minLength={2}
      />
      {field.schoolHits.length > 0 ? (
        <ul className="max-h-40 overflow-auto rounded border bg-popover text-sm shadow-md">
          {field.schoolHits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left hover:bg-muted"
                onClick={() => field.chooseSchool(h)}
              >
                <span className="flex items-center gap-2">
                  <SchoolLogo logoPath={h.logoPath ?? null} alt="" size="xs" />
                  {h.displayName}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!field.selectedSchool && field.schoolQuery.trim().length >= 2 && field.schoolHits.length === 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-muted-foreground">School not found yet.</span>
          <Link href={addSchoolHref} className="text-primary underline">
            Add a school or team
          </Link>
        </div>
      ) : null}

      {field.selectedSchool ? (
        <>
          <Label htmlFor={`${idPrefix}-team`}>{teamLabelText}</Label>
          <select
            id={`${idPrefix}-team`}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
            value={field.teamId}
            onChange={(e) => field.chooseTeam(e.target.value)}
            required
          >
            <option value="">Choose team...</option>
            {field.teamOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            {field.teamOptions.length === 0 ? (
              <span className="text-muted-foreground">No teams linked to this school yet.</span>
            ) : (
              <span className="text-muted-foreground">Missing team?</span>
            )}
            <Link href={addTeamHref} className="text-primary underline">
              Add a school or team
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}

function NewLiveGameForm({
  hubSport,
  seasonOptions,
  competitionOptions,
  turnToken,
  onToken,
  onDone,
}: {
  /** When set, new sessions use this sport (matches URL filter). */
  hubSport?: SchoolSport;
  seasonOptions: LiveScheduleOption[];
  competitionOptions: LiveScheduleOption[];
  turnToken: string | null;
  onToken: (t: string | null) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pickSport, setPickSport] = useState<SchoolSport>("RUGBY");
  const [hockeyGender, setHockeyGender] = useState<TeamGender | "">("");
  const [seasonId, setSeasonId] = useState("");
  const [competitionId, setCompetitionId] = useState("");
  const effectiveSport = hubSport ?? pickSport;
  const hockeySearchGender = effectiveSport === "HOCKEY" ? hockeyGender || undefined : undefined;
  const school1Field = useLiveSchoolTeamField(effectiveSport, hockeySearchGender);
  const school2Field = useLiveSchoolTeamField(
    effectiveSport,
    hockeySearchGender,
    school1Field.selectedTeam?.ageGroup,
  );

  const seasonsForSport = useMemo(
    () => seasonOptions.filter((o) => o.sport === effectiveSport),
    [seasonOptions, effectiveSport]
  );
  const competitionsForSport = useMemo(
    () => competitionOptions.filter((o) => o.sport === effectiveSport),
    [competitionOptions, effectiveSport]
  );

  useEffect(() => {
    if (effectiveSport !== "HOCKEY") setHockeyGender("");
  }, [effectiveSport]);

  useEffect(() => {
    setSeasonId((prev) => {
      const sOpts = seasonOptions.filter((o) => o.sport === effectiveSport);
      return prev && sOpts.some((s) => s.id === prev) ? prev : "";
    });
    setCompetitionId((prev) => {
      const cOpts = competitionOptions.filter((o) => o.sport === effectiveSport);
      return prev && cOpts.some((c) => c.id === prev) ? prev : "";
    });
  }, [effectiveSport, seasonOptions, competitionOptions]);

  useEffect(() => {
    const t1 = school1Field.selectedTeam;
    if (!t1 || !school2Field.selectedSchool || school2Field.teamId) return;
    const opts = school2Field.teamOptions;
    if (opts.length === 0) return;
    const sameSide =
      opts.find(
        (t) =>
          sameAgeGroupBand(t.ageGroup, t1.ageGroup) &&
          t.teamLabel.trim().toLowerCase() === t1.teamLabel.trim().toLowerCase()
      ) ?? opts.find((t) => sameAgeGroupBand(t.ageGroup, t1.ageGroup));
    const pick = sameSide ?? opts[0];
    if (pick) school2Field.chooseTeam(pick.id);
    // Intentionally depend on team option state only (not the whole field object).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot when school-2 team list loads
  }, [
    school1Field.selectedTeam,
    school1Field.teamId,
    school2Field.selectedSchool,
    school2Field.teamOptions,
    school2Field.teamId,
  ]);

  return (
    <form
      className="mx-auto grid w-full max-w-md gap-3 pt-1 text-center justify-items-stretch"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => {
          void (async () => {
            if (effectiveSport === "HOCKEY" && hockeyGender === "") {
              toast.error("Choose boys or girls for hockey before starting a live game.");
              return;
            }
            if (!school1Field.teamId || !school2Field.teamId) {
              toast.error("Choose School 1/Team 1 and School 2/Team 2 before starting.");
              return;
            }
            if (
              school1Field.selectedTeam &&
              school2Field.selectedTeam &&
              school1Field.selectedTeam.ageGroup !== school2Field.selectedTeam.ageGroup
            ) {
              toast.error("Choose teams in the same age group (e.g. U13 vs U13).");
              return;
            }
            const res = await createLiveSessionAction({
              homeTeamName: school1Field.teamLabel.trim(),
              awayTeamName: school2Field.teamLabel.trim(),
              homeLogoPath: school1Field.selectedSchool?.logoPath ?? null,
              awayLogoPath: school2Field.selectedSchool?.logoPath ?? null,
              venue: fd.get("venue") ? String(fd.get("venue")) : null,
              sport: effectiveSport,
              teamGender: effectiveSport === "HOCKEY" ? (hockeyGender as TeamGender) : null,
              seasonId: seasonId || null,
              competitionId: competitionId || null,
              turnstileToken: turnToken,
            });
            if (!res.ok) {
              if ("fieldErrors" in res && res.fieldErrors) {
                toast.error("Check the form.");
                return;
              }
              if ("error" in res) {
                const existingId =
                  "existingSessionId" in res && typeof res.existingSessionId === "string"
                    ? res.existingSessionId
                    : undefined;
                if (existingId) {
                  toast.error(res.error, {
                    action: {
                      label: "Open game",
                      onClick: () => router.push(`/live/${existingId}`),
                    },
                  });
                } else {
                  toast.error(res.error);
                }
              }
              return;
            }
            toast.success("Live game started.");
            onDone();
          })();
        });
      }}
    >
      {!hubSport ? (
        <div className="space-y-1 text-left">
          <Label htmlFor="nl-sport">Sport *</Label>
          <select
            id="nl-sport"
            name="sport"
            value={pickSport}
            onChange={(e) => setPickSport(e.target.value as SchoolSport)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {SCHOOL_SPORTS.map((s) => (
              <option key={s} value={s}>
                {schoolSportLabel(s)}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {effectiveSport === "HOCKEY" ? (
        <div className="space-y-1 text-left">
          <Label htmlFor="nl-hockey-side">Hockey side *</Label>
          <select
            id="nl-hockey-side"
            value={hockeyGender}
            onChange={(e) => setHockeyGender((e.target.value || "") as TeamGender | "")}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            required
          >
            <option value="" disabled>
              Select boys or girls…
            </option>
            {TEAM_GENDERS.map((g) => (
              <option key={g} value={g}>
                {teamGenderLabel(g)}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            School search matches the correct hockey team row (boys vs girls).
          </p>
        </div>
      ) : null}
      <LiveSchoolTeamField
        idPrefix="nl-school-1"
        schoolLabel="School 1 *"
        teamLabelText="Team 1 *"
        field={school1Field}
      />
      <LiveSchoolTeamField
        idPrefix="nl-school-2"
        schoolLabel="School 2 *"
        teamLabelText="Team 2 *"
        field={school2Field}
      />
      <div className="space-y-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-3 text-left">
        <p className="text-sm font-medium text-foreground">Season OR competition (optional)</p>
        <p className="text-xs text-muted-foreground">
          Shown for <span className="text-foreground">{schoolSportLabel(effectiveSport)}</span> only. Pick a season
          <span className="text-foreground"> or </span> a competition (not both)—or leave both blank.
        </p>
        <div className="space-y-1">
          <Label
            htmlFor="nl-season"
            className={cn(competitionId !== "" && "text-muted-foreground")}
            title={competitionId ? "Clear competition to choose a season" : undefined}
          >
            Season
          </Label>
          <select
            id="nl-season"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
            value={seasonId}
            disabled={competitionId !== ""}
            onChange={(e) => {
              const v = e.target.value;
              setSeasonId(v);
              if (v) setCompetitionId("");
            }}
          >
            <option value="">— None —</option>
            {seasonsForSport.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label
            htmlFor="nl-competition"
            className={cn(seasonId !== "" && "text-muted-foreground")}
            title={seasonId ? "Clear season to choose a competition" : undefined}
          >
            Competition
          </Label>
          <select
            id="nl-competition"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-45"
            value={competitionId}
            disabled={seasonId !== ""}
            onChange={(e) => {
              const v = e.target.value;
              setCompetitionId(v);
              if (v) setSeasonId("");
            }}
          >
            <option value="">— None —</option>
            {competitionsForSport.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1 text-left">
        <Label htmlFor="nl-venue">Venue (optional)</Label>
        <Input id="nl-venue" name="venue" />
      </div>
      <div className="flex justify-center">
        <TurnstilePlaceholder onToken={onToken} />
      </div>
      <Button type="submit" disabled={pending} className="mx-auto w-full max-w-xs">
        {pending ? "Starting…" : "Go live"}
      </Button>
    </form>
  );
}
