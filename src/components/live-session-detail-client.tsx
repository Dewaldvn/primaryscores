"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LiveSessionActiveCard } from "@/components/live-session-active-card";
import { LiveScoreFeedAside } from "@/components/live-score-feed-aside";
import { LiveSessionShareBar } from "@/components/live-session-share-bar";
import { cn } from "@/lib/utils";
import { SCORE_RESULT_FRAME_CLASS } from "@/lib/score-result-frame";
import type { LiveScoreFeedItem, LiveSessionClientRow, LiveSessionViewer } from "@/lib/live-session-types";

const POLL_MS = 15_000;

type DetailPayload = {
  session: LiveSessionClientRow;
  scoreFeed: LiveScoreFeedItem[];
  viewer: LiveSessionViewer | null;
};

export function LiveSessionDetailClient({
  sessionId,
  signedIn,
  isAdmin,
}: {
  sessionId: string;
  signedIn: boolean;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<DetailPayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [turnVote, setTurnVote] = useState<string | null>(null);
  const [turnWrapup, setTurnWrapup] = useState<string | null>(null);
  const [, start] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/live-sessions/${sessionId}`, { cache: "no-store" });
      setLoading(false);
      if (res.status === 404) {
        setNotFound(true);
        setPayload(null);
        setLoadErr(null);
        return;
      }
      const data = (await res.json()) as {
        session?: LiveSessionClientRow | null;
        scoreFeed?: LiveScoreFeedItem[];
        viewer?: LiveSessionViewer | null;
        error?: string;
      };
      if (!res.ok) {
        setNotFound(false);
        setPayload(null);
        setLoadErr(
          data.error === "failed"
            ? "Could not load this game (server error). Check that database migrations are applied."
            : "Could not load this game."
        );
        return;
      }
      if (!data.session) {
        setNotFound(true);
        setPayload(null);
        setLoadErr(null);
        return;
      }
      setNotFound(false);
      setPayload({
        session: data.session,
        scoreFeed: Array.isArray(data.scoreFeed) ? data.scoreFeed : [],
        viewer: data.viewer ?? null,
      });
      setLoadErr(null);
    } catch {
      setLoading(false);
      setLoadErr("Could not load this live game.");
    }
  }, [sessionId]);

  useEffect(() => {
    void refresh();
    const t = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(t);
  }, [refresh]);

  if (loading) {
    return <p className="text-center text-sm text-muted-foreground">Loading live game…</p>;
  }

  if (loadErr) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-destructive">{loadErr}</p>
        <button
          type="button"
          className="text-sm text-primary underline"
          onClick={() => start(() => void refresh())}
        >
          Try again
        </button>
      </div>
    );
  }

  if (notFound || !payload) {
    return (
      <div className="space-y-3 text-center text-sm text-muted-foreground">
        <p>This live game is not available — it may have ended or the link is incorrect.</p>
        <Link href="/" className="text-primary underline">
          Back to home
        </Link>
      </div>
    );
  }

  const { session, scoreFeed, viewer } = payload;
  /** Rugby / Netball / Hockey / Soccer use the tap-vote board (share strip inside the board). */
  const tapVoteBoardLayout =
    session.sport === "RUGBY" ||
    session.sport === "NETBALL" ||
    session.sport === "HOCKEY" ||
    session.sport === "SOCCER";

  return (
    <div className={cn("mx-auto flex w-full flex-col gap-4", tapVoteBoardLayout ? "max-w-3xl" : "max-w-5xl")}>
      {!tapVoteBoardLayout ? (
        <div className={cn(SCORE_RESULT_FRAME_CLASS, "rounded-lg bg-card p-3 text-center text-sm")}>
          <p className="mb-2 text-muted-foreground">Share this score</p>
          <LiveSessionShareBar session={session} />
        </div>
      ) : null}
      <div
        className={cn(
          "grid gap-4",
          !tapVoteBoardLayout && "lg:grid-cols-[minmax(0,1fr),minmax(200px,260px)] lg:items-start"
        )}
      >
        <div className="min-w-0 space-y-4">
          <LiveSessionActiveCard
            session={session}
            signedIn={signedIn}
            isAdmin={isAdmin}
            viewer={viewer}
            onRefresh={refresh}
            onSessionDeleted={() => router.push("/live")}
            turnVoteToken={turnVote}
            onVoteToken={setTurnVote}
            turnWrapupToken={turnWrapup}
            onWrapupToken={setTurnWrapup}
          />
        </div>
        <LiveScoreFeedAside items={scoreFeed} />
      </div>
    </div>
  );
}
