"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { formatDistanceToNowStrict } from "date-fns";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolLogo } from "@/components/school-logo";
import { TurnstilePlaceholder } from "@/components/turnstile-placeholder";
import { castLiveVoteAction, submitLiveWrapupForReviewAction } from "@/actions/live-scores";
import { LIVE_AUTO_SUBMIT_AFTER_MIN } from "@/lib/live-constants";
import { ProfileAvatar } from "@/components/profile-avatar";
import type { LiveSessionClientRow, LiveSessionViewer } from "@/lib/live-session-types";

function wrapupCountdownMin(s: LiveSessionClientRow): number | null {
  if (!s.firstVoteAt || !s.inWrapup) return null;
  const left = s.autoSubmitAfterMinutes - (s.minutesSinceFirstVote ?? 0);
  return Math.max(0, Math.ceil(left));
}

export function LiveSessionActiveCard({
  session: s,
  signedIn,
  viewer,
  onRefresh,
  turnVoteToken,
  onVoteToken,
  turnWrapupToken,
  onWrapupToken,
}: {
  session: LiveSessionClientRow;
  signedIn: boolean;
  viewer: LiveSessionViewer | null;
  onRefresh: () => void;
  turnVoteToken: string | null;
  onVoteToken: (t: string | null) => void;
  turnWrapupToken: string | null;
  onWrapupToken: (t: string | null) => void;
}) {
  const [pending, start] = useTransition();

  return (
    <Card>
      <CardHeader className="pb-2 text-center">
        <CardTitle className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base leading-snug">
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
        <CardDescription className="text-center">
          {s.venue ? `${s.venue} · ` : null}
          {s.inWrapup ? (
            <span className="font-medium text-amber-700 dark:text-amber-400">
              Wrap-up: confirm finished and submit for review
              {wrapupCountdownMin(s) != null ? ` · auto-submit in ~${wrapupCountdownMin(s)} min` : null}
            </span>
          ) : s.firstVoteAt ? (
            <span>First score {formatDistanceToNowStrict(new Date(s.firstVoteAt), { addSuffix: true })}</span>
          ) : (
            "Waiting for first score update"
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center space-y-3 text-center text-sm">
        <p className="font-mono text-3xl font-semibold tabular-nums sm:text-4xl">
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
            homeLogoPath={s.homeLogoPath}
            awayLogoPath={s.awayLogoPath}
            viewer={viewer}
            disabled={s.status === "CLOSED"}
            turnToken={turnVoteToken}
            onToken={onVoteToken}
            onSuccess={() => void onRefresh()}
          />
        ) : (
          <p className="border-t pt-3 text-xs text-muted-foreground">
            <LinkButton href={`/login?redirect=${encodeURIComponent(`/live/${s.id}`)}`} variant="link" className="h-auto p-0 text-xs">
              Sign in
            </LinkButton>{" "}
            to submit or change scores.
          </p>
        )}
        {s.inWrapup ? (
          <div className="w-full rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-center text-xs">
            <p className="mb-2 text-foreground">
              If the match has ended, send this majority score to moderators for review (same queue as regular
              submissions). If nobody does, the system submits automatically at {LIVE_AUTO_SUBMIT_AFTER_MIN} minutes
              from the first live score.
            </p>
            {signedIn ? (
              <>
                <TurnstilePlaceholder onToken={onWrapupToken} />
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
                  Submit score for review
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">
                <LinkButton href={`/login?redirect=${encodeURIComponent(`/live/${s.id}`)}`} variant="link" className="h-auto p-0 text-xs">
                  Sign in
                </LinkButton>{" "}
                to submit this score for review.
              </p>
            )}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function VoteForm({
  sessionId,
  homeTeamName,
  awayTeamName,
  homeLogoPath,
  awayLogoPath,
  viewer,
  disabled,
  turnToken,
  onToken,
  onSuccess,
}: {
  sessionId: string;
  homeTeamName: string;
  awayTeamName: string;
  homeLogoPath: string | null;
  awayLogoPath: string | null;
  viewer: LiveSessionViewer | null;
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
      <div className="flex flex-wrap items-end justify-center gap-6 sm:gap-8">
        <div className="flex max-w-[12rem] flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2">
            {homeLogoPath ? <SchoolLogo logoPath={homeLogoPath} alt="" size="sm" className="shrink-0" /> : null}
            <Label className="line-clamp-2 max-w-[10rem] text-xs leading-tight" title={homeTeamName}>
              {homeTeamName}
            </Label>
          </div>
          <Input
            name="homeScore"
            type="number"
            min={0}
            max={200}
            required
            className="h-12 w-[4.25rem] text-center font-mono text-3xl tabular-nums sm:h-14 sm:w-24 sm:text-4xl"
          />
        </div>
        <div className="flex max-w-[12rem] flex-col items-center gap-2">
          <div className="flex items-center justify-center gap-2">
            {awayLogoPath ? <SchoolLogo logoPath={awayLogoPath} alt="" size="sm" className="shrink-0" /> : null}
            <Label className="line-clamp-2 max-w-[10rem] text-xs leading-tight" title={awayTeamName}>
              {awayTeamName}
            </Label>
          </div>
          <Input
            name="awayScore"
            type="number"
            min={0}
            max={200}
            required
            className="h-12 w-[4.25rem] text-center font-mono text-3xl tabular-nums sm:h-14 sm:w-24 sm:text-4xl"
          />
        </div>
      </div>
      {viewer ? (
        <div className="flex items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          <ProfileAvatar avatarUrl={viewer.avatarUrl} displayName={viewer.displayName} size="xs" />
          <span>
            Submitting as <span className="font-medium text-foreground">{viewer.displayName}</span>
          </span>
        </div>
      ) : null}
      <TurnstilePlaceholder onToken={onToken} />
      <Button type="submit" size="sm" variant="secondary" disabled={disabled || pending} className="mx-auto">
        {pending ? "Saving…" : "Submit my view"}
      </Button>
    </form>
  );
}
