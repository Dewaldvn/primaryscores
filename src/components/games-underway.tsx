"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  castLiveVoteAction,
  createLiveSessionAction,
  submitLiveWrapupForReviewAction,
} from "@/actions/live-scores";
import { LIVE_AUTO_SUBMIT_AFTER_MIN, LIVE_WRAPUP_AFTER_MIN } from "@/lib/live-constants";

const POLL_MS = 15_000;

type Majority = { homeScore: number; awayScore: number; voterCount: number } | null;

type LiveSessionRow = {
  id: string;
  homeTeamName: string;
  awayTeamName: string;
  venue: string | null;
  status: string;
  firstVoteAt: string | null;
  majority: Majority;
  minutesSinceFirstVote: number | null;
  inWrapup: boolean;
  autoSubmitAfterMinutes: number;
};

type SchoolHit = {
  id: string;
  displayName: string;
  slug: string;
  town: string | null;
  provinceName: string;
  logoPath: string | null;
  u13TeamId: string | null;
};

export function GamesUnderway({ signedIn }: { signedIn: boolean }) {
  const [sessions, setSessions] = useState<LiveSessionRow[]>([]);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [openNew, setOpenNew] = useState(false);
  const [turnCreate, setTurnCreate] = useState<string | null>(null);
  const [turnVotes, setTurnVotes] = useState<Record<string, string | null>>({});
  const [turnWrapupBySession, setTurnWrapupBySession] = useState<Record<string, string | null>>({});
  const [pending, start] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/live-sessions", { cache: "no-store" });
      const data = (await res.json()) as { sessions?: LiveSessionRow[] };
      setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      setLoadErr(null);
    } catch {
      setLoadErr("Could not load live games.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  function wrapupCountdownMin(s: LiveSessionRow): number | null {
    if (!s.firstVoteAt || !s.inWrapup) return null;
    const left = s.autoSubmitAfterMinutes - (s.minutesSinceFirstVote ?? 0);
    return Math.max(0, Math.ceil(left));
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-lg font-semibold">Games underway</h2>
          <p className="text-sm text-muted-foreground">
            Live scoreboard: signed-in users can open a game and update the score. The board shows the majority view
            of the latest vote per person. Refreshes every {POLL_MS / 1000}s. After {LIVE_WRAPUP_AFTER_MIN} minutes you
            can send the result for moderation; after {LIVE_AUTO_SUBMIT_AFTER_MIN} minutes a submission is created
            automatically if no one does.
          </p>
        </div>
        {signedIn ? (
          <Dialog open={openNew} onOpenChange={setOpenNew}>
            <DialogTrigger render={<Button variant="default" size="sm" />}>
              Start live game
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto text-center sm:max-w-md">
              <DialogHeader className="text-center sm:text-center">
                <DialogTitle>Start a live game</DialogTitle>
              </DialogHeader>
              <NewLiveGameForm
                turnToken={turnCreate}
                onToken={setTurnCreate}
                onDone={() => {
                  setOpenNew(false);
                  setTurnCreate(null);
                  void refresh();
                }}
              />
            </DialogContent>
          </Dialog>
        ) : (
          <LinkButton href="/login?redirect=%2F" variant="default" size="sm">
            Sign in to start a live game
          </LinkButton>
        )}
      </div>

      {loadErr ? <p className="text-sm text-destructive">{loadErr}</p> : null}

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No live games right now.
            {signedIn
              ? " Start one when a match kicks off."
              : " Sign in to start a live game when a match kicks off."}
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Card>
                <CardHeader className="pb-2 text-center">
                  <CardTitle className="text-base leading-snug">
                    {s.homeTeamName} <span className="text-muted-foreground">vs</span> {s.awayTeamName}
                  </CardTitle>
                  <CardDescription className="text-center">
                    {s.venue ? `${s.venue} · ` : null}
                    {s.inWrapup ? (
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        Wrap-up: confirm finished and submit for review
                        {wrapupCountdownMin(s) != null ? ` · auto-submit in ~${wrapupCountdownMin(s)} min` : null}
                      </span>
                    ) : s.firstVoteAt ? (
                      <span>
                        First score {formatDistanceToNowStrict(new Date(s.firstVoteAt), { addSuffix: true })}
                      </span>
                    ) : (
                      "Waiting for first score update"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center space-y-3 text-center text-sm">
                  <p className="font-mono text-2xl font-semibold tabular-nums">
                    {s.majority ? (
                      <>
                        {s.majority.homeScore} – {s.majority.awayScore}
                      </>
                    ) : (
                      <span className="text-muted-foreground">No scores yet</span>
                    )}
                    {s.majority && s.majority.voterCount > 0 ? (
                      <span className="mt-1 block text-xs font-normal text-muted-foreground">
                        (majority across {s.majority.voterCount} voter{s.majority.voterCount !== 1 ? "s" : ""})
                      </span>
                    ) : null}
                  </p>
                  {signedIn ? (
                    <VoteForm
                      sessionId={s.id}
                      homeTeamName={s.homeTeamName}
                      awayTeamName={s.awayTeamName}
                      disabled={s.status === "CLOSED"}
                      turnToken={turnVotes[s.id] ?? null}
                      onToken={(tok) => setTurnVotes((m) => ({ ...m, [s.id]: tok }))}
                      onSuccess={() => void refresh()}
                    />
                  ) : (
                    <p className="border-t pt-3 text-xs text-muted-foreground">
                      <LinkButton href="/login?redirect=%2F" variant="link" className="h-auto p-0 text-xs">
                        Sign in
                      </LinkButton>{" "}
                      to submit or change scores.
                    </p>
                  )}
                  {s.inWrapup ? (
                    <div className="w-full rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs">
                      <p className="mb-2 text-foreground">
                        If the match has ended, send this majority score to moderators for review (same queue as
                        regular submissions). If nobody does, the system submits automatically at{" "}
                        {LIVE_AUTO_SUBMIT_AFTER_MIN} minutes from the first live score.
                      </p>
                      {signedIn ? (
                        <>
                          <TurnstilePlaceholder
                            onToken={(tok) =>
                              setTurnWrapupBySession((m) => ({
                                ...m,
                                [s.id]: tok,
                              }))
                            }
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="mt-2 mx-auto"
                            disabled={pending}
                            onClick={() => {
                              start(() => {
                                void (async () => {
                                  const res = await submitLiveWrapupForReviewAction({
                                    sessionId: s.id,
                                    turnstileToken: turnWrapupBySession[s.id] ?? null,
                                  });
                                  if (!res.ok) {
                                    if ("error" in res) toast.error(res.error);
                                    else toast.error("Could not submit.");
                                    return;
                                  }
                                  toast.success("Sent for review — thank you.");
                                  setTurnWrapupBySession((m) => ({ ...m, [s.id]: null }));
                                  void refresh();
                                })();
                              });
                            }}
                          >
                            Submit score for review
                          </Button>
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          <LinkButton href="/login?redirect=%2F" variant="link" className="h-auto p-0 text-xs">
                            Sign in
                          </LinkButton>{" "}
                          to submit this score for review.
                        </p>
                      )}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function NewLiveGameForm({
  turnToken,
  onToken,
  onDone,
}: {
  turnToken: string | null;
  onToken: (t: string | null) => void;
  onDone: () => void;
}) {
  const [pending, start] = useTransition();
  const [homeQ, setHomeQ] = useState("");
  const [awayQ, setAwayQ] = useState("");
  const [homeHits, setHomeHits] = useState<SchoolHit[]>([]);
  const [awayHits, setAwayHits] = useState<SchoolHit[]>([]);
  const [homeTeamName, setHomeTeamName] = useState("");
  const [awayTeamName, setAwayTeamName] = useState("");

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

  return (
    <form
      className="mx-auto grid w-full max-w-md gap-3 pt-1 text-center justify-items-stretch"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => {
          void (async () => {
            const res = await createLiveSessionAction({
              homeTeamName: homeTeamName.trim(),
              awayTeamName: awayTeamName.trim(),
              venue: fd.get("venue") ? String(fd.get("venue")) : null,
              turnstileToken: turnToken,
            });
            if (!res.ok) {
              if ("fieldErrors" in res && res.fieldErrors) toast.error("Check the form.");
              else if ("error" in res) toast.error(res.error);
              return;
            }
            toast.success("Live game started.");
            onDone();
          })();
        });
      }}
    >
      <div className="space-y-1.5 text-left">
        <Label htmlFor="nl-home-search">Home school search</Label>
        <Input
          id="nl-home-search"
          value={homeQ}
          onChange={(e) => {
            setHomeQ(e.target.value);
            void searchSchools(e.target.value, "home");
          }}
          placeholder="Type at least 2 letters…"
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
                    setHomeHits([]);
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
        <Label htmlFor="nl-home-name">Home team / school name *</Label>
        <Input
          id="nl-home-name"
          value={homeTeamName}
          onChange={(e) => setHomeTeamName(e.target.value)}
          required
          minLength={2}
          placeholder="Pick from search or type the name"
        />
      </div>
      <div className="space-y-1.5 text-left">
        <Label htmlFor="nl-away-search">Away school search</Label>
        <Input
          id="nl-away-search"
          value={awayQ}
          onChange={(e) => {
            setAwayQ(e.target.value);
            void searchSchools(e.target.value, "away");
          }}
          placeholder="Type at least 2 letters…"
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
        <Label htmlFor="nl-away-name">Away team / school name *</Label>
        <Input
          id="nl-away-name"
          value={awayTeamName}
          onChange={(e) => setAwayTeamName(e.target.value)}
          required
          minLength={2}
          placeholder="Pick from search or type the name"
        />
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

function VoteForm({
  sessionId,
  homeTeamName,
  awayTeamName,
  disabled,
  turnToken,
  onToken,
  onSuccess,
}: {
  sessionId: string;
  homeTeamName: string;
  awayTeamName: string;
  disabled: boolean;
  turnToken: string | null;
  onToken: (t: string | null) => void;
  onSuccess: () => void;
}) {
  const [pending, start] = useTransition();
  return (
    <form
      className="flex w-full max-w-md flex-col items-center gap-3 border-t pt-3 text-center"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(() => {
          void (async () => {
            const res = await castLiveVoteAction({
              sessionId,
              homeScore: fd.get("homeScore"),
              awayScore: fd.get("awayScore"),
              turnstileToken: turnToken,
            });
            if (!res.ok) {
              if ("error" in res) toast.error(res.error);
              else toast.error("Could not save vote.");
              return;
            }
            toast.success("Score updated.");
            onSuccess();
          })();
        });
      }}
    >
      <div className="flex flex-wrap items-end justify-center gap-6">
        <div className="flex max-w-[10rem] flex-col items-center gap-1">
          <Label className="line-clamp-2 text-xs leading-tight" title={homeTeamName}>
            {homeTeamName}
          </Label>
          <Input
            name="homeScore"
            type="number"
            min={0}
            max={200}
            required
            className="h-10 w-16 text-center font-mono tabular-nums"
          />
        </div>
        <div className="flex max-w-[10rem] flex-col items-center gap-1">
          <Label className="line-clamp-2 text-xs leading-tight" title={awayTeamName}>
            {awayTeamName}
          </Label>
          <Input
            name="awayScore"
            type="number"
            min={0}
            max={200}
            required
            className="h-10 w-16 text-center font-mono tabular-nums"
          />
        </div>
      </div>
      <TurnstilePlaceholder onToken={onToken} />
      <Button type="submit" size="sm" variant="secondary" disabled={disabled || pending} className="mx-auto">
        {pending ? "Saving…" : "Submit my view"}
      </Button>
    </form>
  );
}
