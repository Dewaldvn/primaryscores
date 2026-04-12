"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
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
import { ScoreCardSportIcons } from "@/components/score-card-sport-icons";
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
  slug: string;
  town: string | null;
  provinceName: string;
  logoPath: string | null;
  u13TeamId: string | null;
};

export function GamesUnderway({
  signedIn,
  startImageAbove = false,
  sportFilter,
}: {
  signedIn: boolean;
  /** When true (live hub), show start_live_game.png above the list; signed-out image links to login. */
  startImageAbove?: boolean;
  /** When set, list and new sessions are scoped to this sport (`?sport=` on the live page). */
  sportFilter?: SchoolSport;
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

  const startLiveImage = (
    <Image
      src="/brand/start_live_game.png"
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
        <Card>
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
      <Card className="relative h-full overflow-hidden transition-colors hover:bg-muted/50">
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

/** For hockey, pass the chosen side so school search can match the correct team row. */
function useLiveTeamField(schoolSport: SchoolSport, hockeySearchGender?: TeamGender) {
  const [name, setName] = useState("");
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [lockedPickName, setLockedPickName] = useState<string | null>(null);
  const [hits, setHits] = useState<SchoolHit[]>([]);

  useEffect(() => {
    setHits([]);
  }, [schoolSport, hockeySearchGender]);

  const onInputChange = (v: string) => {
    setName(v);
    if (lockedPickName !== null && v !== lockedPickName) {
      setLogoPath(null);
      setLockedPickName(null);
    }
  };

  const pickHit = (h: SchoolHit) => {
    setName(h.displayName);
    setLogoPath(h.logoPath);
    setLockedPickName(h.displayName);
    setHits([]);
  };

  const fetchHits = async (q: string) => {
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    if (schoolSport === "HOCKEY" && hockeySearchGender === undefined) {
      setHits([]);
      return;
    }
    const genderQ =
      schoolSport === "HOCKEY" && hockeySearchGender
        ? `&gender=${encodeURIComponent(hockeySearchGender)}`
        : "";
    const res = await fetch(
      `/api/schools/search?q=${encodeURIComponent(q)}&sport=${encodeURIComponent(schoolSport)}${genderQ}`
    );
    const data = (await res.json()) as unknown;
    setHits(Array.isArray(data) ? (data as SchoolHit[]) : []);
  };

  return { name, logoPath, hits, onInputChange, pickHit, fetchHits };
}

function LiveTeamSchoolField({
  id,
  label,
  field,
}: {
  id: string;
  label: string;
  field: ReturnType<typeof useLiveTeamField>;
}) {
  const [matchPickSeq, setMatchPickSeq] = useState(0);
  return (
    <div className="space-y-1.5 text-left">
      <Label htmlFor={id}>{label}</Label>
      <p className="text-xs text-muted-foreground">
        Type to search the directory, tap a result below, or use the dropdown when matches appear.
      </p>
      <Input
        id={id}
        value={field.name}
        onChange={(e) => {
          const v = e.target.value;
          field.onInputChange(v);
          void field.fetchHits(v);
        }}
        placeholder="Search schools or type a name…"
        autoComplete="off"
        required
        minLength={2}
      />
      {field.hits.length > 0 ? (
        <>
          <div className="space-y-1">
            <Label htmlFor={`${id}-pick`} className="text-xs font-normal text-muted-foreground">
              Pick from matches (optional)
            </Label>
            <select
              key={matchPickSeq}
              id={`${id}-pick`}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm"
              defaultValue=""
              onChange={(e) => {
                const schoolId = e.target.value;
                if (!schoolId) return;
                const h = field.hits.find((x) => x.id === schoolId);
                if (h) field.pickHit(h);
                setMatchPickSeq((n) => n + 1);
              }}
            >
              <option value="">— Choose a school —</option>
              {field.hits.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.displayName}
                  {h.town ? ` · ${h.town}` : ""}
                </option>
              ))}
            </select>
          </div>
          <ul className="max-h-40 overflow-auto rounded border bg-popover text-sm shadow-md">
            {field.hits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left hover:bg-muted"
                  onClick={() => field.pickHit(h)}
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
        </>
      ) : null}
    </div>
  );
}

function NewLiveGameForm({
  hubSport,
  turnToken,
  onToken,
  onDone,
}: {
  /** When set, new sessions use this sport (matches URL filter). */
  hubSport?: SchoolSport;
  turnToken: string | null;
  onToken: (t: string | null) => void;
  onDone: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pickSport, setPickSport] = useState<SchoolSport>("RUGBY");
  const [hockeyGender, setHockeyGender] = useState<TeamGender | "">("");
  const effectiveSport = hubSport ?? pickSport;
  const hockeySearchGender = effectiveSport === "HOCKEY" ? hockeyGender || undefined : undefined;
  const homeField = useLiveTeamField(effectiveSport, hockeySearchGender);
  const awayField = useLiveTeamField(effectiveSport, hockeySearchGender);

  useEffect(() => {
    if (effectiveSport !== "HOCKEY") setHockeyGender("");
  }, [effectiveSport]);

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
            const res = await createLiveSessionAction({
              homeTeamName: homeField.name.trim(),
              awayTeamName: awayField.name.trim(),
              homeLogoPath: homeField.logoPath,
              awayLogoPath: awayField.logoPath,
              venue: fd.get("venue") ? String(fd.get("venue")) : null,
              sport: effectiveSport,
              teamGender: effectiveSport === "HOCKEY" ? (hockeyGender as TeamGender) : null,
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
      <LiveTeamSchoolField id="nl-home-team" label="Home team / school *" field={homeField} />
      <LiveTeamSchoolField id="nl-away-team" label="Away team / school *" field={awayField} />
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
