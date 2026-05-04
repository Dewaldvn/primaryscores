"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format, formatDistanceToNowStrict } from "date-fns";
import { Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { SchoolLogo } from "@/components/school-logo";
import { TurnstilePlaceholder } from "@/components/turnstile-placeholder";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  adminDeleteLiveSessionAction,
  adminStopLiveSessionAction,
  adminSubmitLiveSessionAction,
  castLiveVoteAction,
  submitLiveWrapupForReviewAction,
} from "@/actions/live-scores";
import { schoolAdminCancelScheduledLiveSessionAction } from "@/actions/school-admin-live";
import { cn } from "@/lib/utils";
import { schoolSportLabel } from "@/lib/sports";
import { SCORE_RESULT_FRAME_CLASS, SCORE_RESULT_FRAME_DASHED_CLASS } from "@/lib/score-result-frame";
import { LiveSessionShareBar } from "@/components/live-session-share-bar";
import { ScoreCardSportIcons } from "@/components/score-card-sport-icons";
import type { LiveSessionClientRow, LiveSessionViewer } from "@/lib/live-session-types";

export const RUGBY_SCORE_STEPS = [2, 3, 5, 7] as const;
export const NETBALL_HOCKEY_SOCCER_SCORE_STEPS = [1] as const;

/** After score buttons stop changing, submit automatically (middle of 3–5s). */
const AUTO_SUBMIT_DELAY_MS = 4000;

function wrapupCountdownMin(s: LiveSessionClientRow): number | null {
  if (!s.inWrapup || s.minutesSinceScoringOpened == null) return null;
  const left = s.autoSubmitAfterMinutes - s.minutesSinceScoringOpened;
  return Math.max(0, Math.ceil(left));
}

/** e.g. "Paul Roos U13A" → school + badge */
function splitTeamLabel(full: string): { school: string; badge: string | null } {
  const m = full.match(/^(.*?)\s+(U\d+[A-Z]?)\s*$/i);
  if (m) return { school: m[1].trim(), badge: m[2].toUpperCase() };
  return { school: full, badge: null };
}

function teamInitials(name: string): string {
  const cleaned = name.replace(/['']/g, "").trim();
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase() || "?";
}

function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <time
      dateTime={now.toISOString()}
      className={cn("font-mono text-sm tabular-nums text-muted-foreground", className)}
    >
      {format(now, "HH:mm:ss")}
    </time>
  );
}

/** Recording-style pill: pale capsule, red dot, red "LIVE" text. */
function LiveRecordingPill({ variant }: { variant: "live" | "scheduled" }) {
  if (variant === "scheduled") {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-sky-900 shadow-sm dark:border-sky-800 dark:bg-sky-950/70 dark:text-sky-100">
        Scheduled
      </span>
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-red-200/90 bg-[#fef2f2] px-2.5 py-1 shadow-sm dark:border-red-900/50 dark:bg-red-950/45"
      aria-live="polite"
    >
      <span className="size-2 shrink-0 rounded-full bg-red-600 shadow-[0_0_0_1px_rgba(220,38,38,0.25)]" aria-hidden />
      <span className="text-[11px] font-bold uppercase leading-none tracking-wide text-red-600 dark:text-red-500">
        Live
      </span>
    </span>
  );
}

/** Elapsed match time from board open / game start (MM:SS, or H:MM:SS after 1h). */
function MatchElapsedTimer({
  startedAtIso,
  running,
}: {
  startedAtIso: string | null;
  /** When false, show placeholder (e.g. scheduled board not live yet). */
  running: boolean;
}) {
  const [, bump] = useState(0);
  useEffect(() => {
    if (!running || !startedAtIso) return;
    const t = window.setInterval(() => bump((n) => n + 1), 1000);
    return () => window.clearInterval(t);
  }, [running, startedAtIso]);

  const label = (() => {
    if (!running || !startedAtIso) return "--:--";
    const started = new Date(startedAtIso);
    const secs = Math.max(0, Math.floor((Date.now() - started.getTime()) / 1000));
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  })();

  return (
    <time
      dateTime={startedAtIso ?? undefined}
      className="shrink-0 font-mono text-sm font-medium tabular-nums tracking-tight text-foreground"
      title="Time since scoring opened"
    >
      {label}
    </time>
  );
}

function TapScoreSideButtons({
  disabled,
  steps,
  onDelta,
}: {
  disabled: boolean;
  steps: readonly number[];
  onDelta: (delta: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => onDelta(-1)}
        className={cn(
          "min-h-9 min-w-9 rounded-md border border-border bg-background/90 text-sm font-medium text-foreground shadow-sm transition hover:bg-background disabled:opacity-40",
          "dark:bg-card/50 dark:hover:bg-card/70"
        )}
      >
        −
      </button>
      {steps.map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onDelta(n)}
          className={cn(
            "min-h-9 min-w-[2.75rem] rounded-md bg-primary text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-40"
          )}
        >
          +{n}
        </button>
      ))}
    </div>
  );
}

function AdminLiveControls({
  sessionId,
  pending,
  start,
  onRefresh,
  onSessionDeleted,
}: {
  sessionId: string;
  pending: boolean;
  start: (cb: () => void) => void;
  onRefresh: () => void;
  onSessionDeleted?: () => void;
}) {
  return (
    <div className="mt-4 w-full border-t border-dashed border-border pt-4">
      <p className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">Admin</p>
      <div className="mx-auto flex max-w-md flex-col gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          className="w-full border-blue-700 bg-blue-600 text-white hover:bg-blue-700 dark:border-blue-500 dark:bg-blue-600 dark:hover:bg-blue-500"
          onClick={() => {
            start(() => {
              void (async () => {
                const res = await adminStopLiveSessionAction({ sessionId });
                if (!res.ok) {
                  if ("error" in res) toast.error(res.error);
                  return;
                }
                toast.success("Live game moved to wrap-up.");
                onRefresh();
              })();
            });
          }}
        >
          Stop — wrap up
        </Button>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          className="w-full"
          disabled={pending}
          onClick={() => {
            start(() => {
              void (async () => {
                const res = await adminSubmitLiveSessionAction({ sessionId });
                if (!res.ok) {
                  if ("error" in res) toast.error(res.error);
                  return;
                }
                toast.success("Submitted to moderation queue.");
                onRefresh();
              })();
            });
          }}
        >
          Submit to moderation
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          className="w-full"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Delete this live scoreboard and all votes? This cannot be undone.")) return;
            start(() => {
              void (async () => {
                const res = await adminDeleteLiveSessionAction({ sessionId });
                if (!res.ok) {
                  if ("error" in res) toast.error(res.error);
                  return;
                }
                toast.success("Live game deleted.");
                onSessionDeleted?.();
              })();
            });
          }}
        >
          Delete live board
        </Button>
      </div>
    </div>
  );
}

export function LiveSessionTapVoteBoard({
  session: s,
  signedIn,
  isAdmin,
  viewer,
  onRefresh,
  onSessionDeleted,
  turnVoteToken,
  onVoteToken,
  turnWrapupToken,
  onWrapupToken,
  scoreSteps,
}: {
  session: LiveSessionClientRow;
  signedIn: boolean;
  isAdmin: boolean;
  viewer: LiveSessionViewer | null;
  onRefresh: () => void;
  onSessionDeleted?: () => void;
  turnVoteToken: string | null;
  onVoteToken: (t: string | null) => void;
  turnWrapupToken: string | null;
  onWrapupToken: (t: string | null) => void;
  scoreSteps: readonly number[];
}) {
  const [pending, start] = useTransition();
  const [draftH, setDraftH] = useState(0);
  const [draftA, setDraftA] = useState(0);
  const dirtyRef = useRef(false);
  const draftRef = useRef({ h: 0, a: 0 });
  const turnVoteTokenRef = useRef<string | null>(null);
  const autoSubmitTimerRef = useRef<number | null>(null);
  const [autoSavePending, setAutoSavePending] = useState(false);
  const sessionStatusRef = useRef(s.status);
  sessionStatusRef.current = s.status;

  const majorityKey = `${s.majority?.homeScore ?? "-"}:${s.majority?.awayScore ?? "-"}`;

  useEffect(() => {
    draftRef.current = { h: draftH, a: draftA };
  }, [draftH, draftA]);

  useEffect(() => {
    turnVoteTokenRef.current = turnVoteToken;
  }, [turnVoteToken]);

  useEffect(() => {
    return () => {
      if (autoSubmitTimerRef.current != null) {
        window.clearTimeout(autoSubmitTimerRef.current);
      }
    };
  }, []);

  function clearAutoSubmitTimer() {
    if (autoSubmitTimerRef.current != null) {
      window.clearTimeout(autoSubmitTimerRef.current);
      autoSubmitTimerRef.current = null;
    }
    setAutoSavePending(false);
  }

  function runVoteSubmit() {
    clearAutoSubmitTimer();
    start(() => {
      void (async () => {
        const st = sessionStatusRef.current;
        if (st === "CLOSED" || st === "SCHEDULED") return;
        const { h, a } = draftRef.current;
        const res = await castLiveVoteAction({
          sessionId: s.id,
          homeScore: h,
          awayScore: a,
          turnstileToken: turnVoteTokenRef.current,
        });
        if (!res.ok) {
          if ("error" in res) toast.error(res.error);
          else toast.error("Could not save vote.");
          return;
        }
        toast.success("Score updated.");
        dirtyRef.current = false;
        onVoteToken(null);
        void onRefresh();
      })();
    });
  }

  function scheduleAutoSubmit() {
    clearAutoSubmitTimer();
    setAutoSavePending(true);
    autoSubmitTimerRef.current = window.setTimeout(() => {
      autoSubmitTimerRef.current = null;
      setAutoSavePending(false);
      runVoteSubmit();
    }, AUTO_SUBMIT_DELAY_MS) as unknown as number;
  }

  useEffect(() => {
    if (dirtyRef.current) return;
    if (s.majority) {
      setDraftH(s.majority.homeScore);
      setDraftA(s.majority.awayScore);
    } else {
      setDraftH(0);
      setDraftA(0);
    }
  }, [majorityKey, s.majority]);

  const openedAt = s.scoringOpenedAt ? new Date(s.scoringOpenedAt) : null;
  const homeParts = splitTeamLabel(s.homeTeamName);
  const awayParts = splitTeamLabel(s.awayTeamName);
  const ageBadges = Array.from(
    new Set([homeParts.badge, awayParts.badge].filter((b): b is string => Boolean(b)))
  );
  const centerTitle =
    s.status === "SCHEDULED" && s.goesLiveAt
      ? `${schoolSportLabel(s.sport)} — opens ${format(new Date(s.goesLiveAt), "dd MMM yyyy HH:mm")}`
      : (() => {
          const sport = schoolSportLabel(s.sport);
          const startedPart = openedAt ? ` — started ${format(openedAt, "HH:mm")}` : "";
          const extra = [
            ageBadges.length ? ageBadges.join(" / ") : null,
            s.venue?.trim() || null,
          ]
            .filter(Boolean)
            .join(" · ");
          return extra ? `${sport}${startedPart} · ${extra}` : `${sport}${startedPart}`;
        })();

  /** Crowd majority (read-only reference). */
  const displayHome = s.majority?.homeScore ?? 0;
  const displayAway = s.majority?.awayScore ?? 0;
  const voteDisabled = s.status === "CLOSED" || s.status === "SCHEDULED";

  /** Large digits: show what you’re editing when signed in; otherwise show crowd majority. */
  function bigScoreForColumn(idx: number): number | null {
    if (signedIn) return idx === 0 ? draftH : draftA;
    if (s.majority) return idx === 0 ? displayHome : displayAway;
    return null;
  }

  function adjust(side: "home" | "away", delta: number) {
    if (voteDisabled || !signedIn) return;
    dirtyRef.current = true;
    if (side === "home") setDraftH((x) => Math.min(200, Math.max(0, x + delta)));
    else setDraftA((x) => Math.min(200, Math.max(0, x + delta)));
    scheduleAutoSubmit();
  }

  return (
    <div className="space-y-4">
      <div className={cn(SCORE_RESULT_FRAME_CLASS, "rounded-lg bg-card px-3 py-2 shadow-sm")}>
        <p className="mb-1.5 text-center text-[11px] text-muted-foreground">Share this score</p>
        <LiveSessionShareBar session={s} />
      </div>

      {/* Status row: LIVE pill + elapsed | centered title | wall clock */}
      <div className="flex flex-col gap-3">
        <Link
          href="/live"
          className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          ← Back
        </Link>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
            <LiveRecordingPill variant={s.status === "SCHEDULED" ? "scheduled" : "live"} />
            <MatchElapsedTimer
              startedAtIso={s.scoringOpenedAt}
              running={s.status !== "SCHEDULED" && Boolean(s.scoringOpenedAt)}
            />
          </div>
          <p className="min-w-0 flex-1 px-1 text-center text-xs leading-snug text-foreground sm:text-sm">
            {centerTitle}
          </p>
          <LiveClock className="shrink-0" />
        </div>
      </div>

      {s.canCancelScheduled ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Cancel this scheduled scoreboard?")) return;
              start(() => {
                void (async () => {
                  const res = await schoolAdminCancelScheduledLiveSessionAction({ sessionId: s.id });
                  if (!res.ok) {
                    if ("error" in res) toast.error(res.error);
                    return;
                  }
                  toast.success("Scheduled game removed.");
                  window.location.href = "/school-admin/schedule-live";
                })();
              });
            }}
          >
            Cancel scheduled game
          </Button>
        </div>
      ) : null}

      {/* Score shell */}
      {s.status !== "SCHEDULED" ? (
      <div
        className={cn(
          SCORE_RESULT_FRAME_CLASS,
          "relative overflow-hidden rounded-2xl bg-gradient-to-b from-primary/[0.07] to-accent/[0.14] px-3 py-5 shadow-sm dark:from-primary/15 dark:to-card/90"
        )}
      >
        <ScoreCardSportIcons sport={s.sport} teamGender={s.teamGender} className="bottom-3 left-3" />
        <div className="grid grid-cols-2 gap-3 sm:gap-6">
          {(["home", "away"] as const).map((side, idx) => {
            const parts = idx === 0 ? homeParts : awayParts;
            const big = bigScoreForColumn(idx);
            const crowd = s.majority ? (idx === 0 ? displayHome : displayAway) : null;
            const logo = idx === 0 ? s.homeLogoPath : s.awayLogoPath;
            const initials = teamInitials(parts.school);
            const crowdDiffers =
              signedIn &&
              s.majority &&
              (draftH !== displayHome || draftA !== displayAway);
            return (
              <div key={side} className="flex flex-col items-center gap-3 text-center">
                <div className="flex items-center gap-2">
                  {logo ? (
                    <SchoolLogo logoPath={logo} alt="" size="md" className="shrink-0 rounded-sm border border-white/60 bg-white shadow-sm" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-card/95 font-mono text-sm font-bold text-foreground shadow-sm dark:border-primary/35 dark:bg-card/90">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5 px-1">
                  <p className="text-sm font-semibold leading-tight text-foreground">{parts.school}</p>
                  {parts.badge ? (
                    <p className="text-xs font-medium text-muted-foreground">{parts.badge}</p>
                  ) : null}
                </div>
                <p className="font-mono text-5xl font-bold tabular-nums tracking-tight text-foreground sm:text-6xl">
                  {big !== null ? big : "—"}
                </p>
                {signedIn && crowdDiffers && crowd !== null ? (
                  <p className="text-[11px] text-muted-foreground">
                    Crowd: <span className="font-mono text-foreground">{crowd}</span>
                  </p>
                ) : null}
                <TapScoreSideButtons
                  disabled={voteDisabled || !signedIn}
                  steps={scoreSteps}
                  onDelta={(d) => adjust(side, d)}
                />
                {!signedIn ? <p className="text-[11px] text-muted-foreground">Sign in to vote</p> : null}
              </div>
            );
          })}
        </div>
      </div>
      ) : null}

      {/* Submit vote — directly under score board; auto-saves ~4s after score taps */}
      {signedIn && s.status !== "CLOSED" && s.status !== "SCHEDULED" ? (
        <form
          className={cn(SCORE_RESULT_FRAME_CLASS, "space-y-3 rounded-xl bg-card/40 px-3 py-4")}
          onSubmit={(e) => {
            e.preventDefault();
            runVoteSubmit();
          }}
        >
          {viewer ? (
            <div
              className={cn(
                SCORE_RESULT_FRAME_DASHED_CLASS,
                "flex items-center justify-center gap-2 rounded-md bg-muted/30 px-3 py-2 text-xs text-muted-foreground"
              )}
            >
              <ProfileAvatar avatarUrl={viewer.avatarUrl} displayName={viewer.displayName} size="xs" />
              <span>
                Submitting as <span className="font-medium text-foreground">{viewer.displayName}</span>
              </span>
            </div>
          ) : null}
          <TurnstilePlaceholder onToken={onVoteToken} />
          <p className="text-center text-[11px] text-muted-foreground">
            After you tap the score buttons, we save your view automatically in about {AUTO_SUBMIT_DELAY_MS / 1000}{" "}
            seconds (or press the button to send straight away).
          </p>
          <Button
            type="submit"
            className="mx-auto flex w-full max-w-xs sm:w-auto"
            disabled={voteDisabled || pending}
          >
            {pending ? "Saving…" : "Submit my view"}
          </Button>
          {autoSavePending ? (
            <p className="text-center text-xs font-medium text-primary">
              Saving your score shortly…
            </p>
          ) : null}
        </form>
      ) : !signedIn && s.status !== "CLOSED" && s.status !== "SCHEDULED" ? (
        <p
          className={cn(
            SCORE_RESULT_FRAME_DASHED_CLASS,
            "rounded-lg bg-muted/20 px-3 py-3 text-center text-xs text-muted-foreground"
          )}
        >
          <LinkButton href={`/login?redirect=${encodeURIComponent(`/live/${s.id}`)}`} variant="link" className="h-auto p-0 text-xs">
            Sign in
          </LinkButton>{" "}
          to submit or change scores.
        </p>
      ) : null}

      {/* Wrap-up */}
      {s.inWrapup ? (
        <div
          className={cn(
            SCORE_RESULT_FRAME_CLASS,
            "flex flex-col gap-3 rounded-xl bg-amber-50/90 p-4 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between"
          )}
        >
          <div className="flex gap-3 text-sm">
            <Clock className="mt-0.5 size-5 shrink-0 text-amber-800 dark:text-amber-300" aria-hidden />
            <p className="leading-snug text-foreground">
              <span className="font-medium">Wrap-up window open.</span> Confirm the match has finished and we&apos;ll submit
              {s.majority ? (
                <>
                  {" "}
                  <span className="font-mono font-semibold">
                    {s.majority.homeScore} — {s.majority.awayScore}
                  </span>
                </>
              ) : null}{" "}
              for moderation.
              {wrapupCountdownMin(s) != null ? ` Auto-submits in ~${wrapupCountdownMin(s)} min.` : null}
            </p>
          </div>
          {signedIn ? (
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <TurnstilePlaceholder onToken={onWrapupToken} />
              <Button
                type="button"
                disabled={pending}
                onClick={() => {
                  start(() => {
                    void (async () => {
                      const res = await submitLiveWrapupForReviewAction({
                        sessionId: s.id,
                        turnstileToken: turnWrapupToken,
                      });
                      if (!res.ok) {
                        if ("error" in res) toast.error(res.error);
                        else toast.error("Could not submit.");
                        return;
                      }
                      toast.success("Sent for review — thank you.");
                      onWrapupToken(null);
                      void onRefresh();
                    })();
                  });
                }}
              >
                Confirm finished
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              <LinkButton href={`/login?redirect=${encodeURIComponent(`/live/${s.id}`)}`} variant="link" className="h-auto p-0">
                Sign in
              </LinkButton>{" "}
              to confirm.
            </p>
          )}
        </div>
      ) : null}

      {/* Stats row */}
      {s.status !== "SCHEDULED" ? (
      <div className="grid gap-3 sm:grid-cols-2">
        <div className={cn(SCORE_RESULT_FRAME_CLASS, "rounded-xl bg-muted/35 px-4 py-4 text-center dark:bg-muted/25")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Voters</p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-foreground">
            {s.majority ? s.majority.voterCount : "0"}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">Distinct people (latest vote each)</p>
        </div>
        <div className={cn(SCORE_RESULT_FRAME_CLASS, "rounded-xl bg-muted/35 px-4 py-4 text-center dark:bg-muted/25")}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Majority score</p>
          <p className="mt-1 font-mono text-3xl font-bold tabular-nums text-foreground">
            {s.majority ? (
              <>
                {s.majority.homeScore} — {s.majority.awayScore}
              </>
            ) : (
              "—"
            )}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {s.firstVoteAt
              ? `First score ${formatDistanceToNowStrict(new Date(s.firstVoteAt), { addSuffix: true })}`
              : "Waiting for votes"}
          </p>
        </div>
      </div>
      ) : null}

      {s.status === "SCHEDULED" && s.goesLiveAt ? (
        <p className="text-center text-sm font-medium text-sky-800 dark:text-sky-200">
          Opens {format(new Date(s.goesLiveAt), "dd MMM yyyy HH:mm")}
        </p>
      ) : null}

      {isAdmin && signedIn && s.status !== "CLOSED" ? (
        <AdminLiveControls
          sessionId={s.id}
          pending={pending}
          start={start}
          onRefresh={onRefresh}
          onSessionDeleted={onSessionDeleted}
        />
      ) : null}
    </div>
  );
}
