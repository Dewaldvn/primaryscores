"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { LiveSessionActiveCard } from "@/components/live-session-active-card";
import { LiveScoreFeedAside } from "@/components/live-score-feed-aside";
import { LiveSessionShareBar } from "@/components/live-session-share-bar";
import { LIVE_PRESENCE_WINDOW_MINUTES } from "@/lib/live-presence-constants";
import type {
  LiveScoreFeedItem,
  LiveSessionClientRow,
  LiveSessionViewer,
} from "@/lib/live-session-types";

const POLL_MS = 15_000;
const PRESENCE_POST_MS = 20_000;
const GUEST_PRESENCE_LS = "prs-live-presence-guest";

const GUEST_KEY_RE =
  /^guest:[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function readGuestViewerKey(): string {
  if (typeof window === "undefined") return "";
  try {
    let g = localStorage.getItem(GUEST_PRESENCE_LS);
    if (!g || !GUEST_KEY_RE.test(g)) {
      g = `guest:${crypto.randomUUID()}`;
      localStorage.setItem(GUEST_PRESENCE_LS, g);
    }
    return g;
  } catch {
    return `guest:${crypto.randomUUID()}`;
  }
}

type DetailPayload = {
  session: LiveSessionClientRow;
  scoreFeed: LiveScoreFeedItem[];
  viewer: LiveSessionViewer | null;
};

export function LiveSessionDetailClient({
  sessionId,
  signedIn,
  viewerProfileId,
}: {
  sessionId: string;
  signedIn: boolean;
  viewerProfileId: string | null;
}) {
  const [payload, setPayload] = useState<DetailPayload | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [turnVote, setTurnVote] = useState<string | null>(null);
  const [turnWrapup, setTurnWrapup] = useState<string | null>(null);
  const [presenceViewerKey, setPresenceViewerKey] = useState<string | null>(null);
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

  useEffect(() => {
    if (viewerProfileId) {
      setPresenceViewerKey(`user:${viewerProfileId}`);
      return;
    }
    setPresenceViewerKey(readGuestViewerKey());
  }, [viewerProfileId]);

  useEffect(() => {
    if (!presenceViewerKey) return;
    const send = () => {
      void fetch(`/api/live-sessions/${sessionId}/presence`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ viewerKey: presenceViewerKey }),
      });
    };
    send();
    const t = setInterval(send, PRESENCE_POST_MS);
    return () => clearInterval(t);
  }, [sessionId, presenceViewerKey]);

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
  const viewers = session.activeViewerCount ?? 0;
  const multiViewers = viewers > 1;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
      <div className="rounded-lg border bg-card p-3 text-center text-sm">
        <p className="mb-2 text-muted-foreground">Share this score</p>
        <LiveSessionShareBar session={session} />
      </div>
      {multiViewers ? (
        <div
          role="status"
          className="rounded-md border border-amber-600/50 bg-amber-500/15 px-3 py-2 text-sm text-amber-950 dark:text-amber-50"
        >
          <strong className="font-semibold">Multiple people on this live page.</strong>{" "}
          <span className="text-amber-950/90 dark:text-amber-50/90">
            About {viewers} devices have this game open in the last {LIVE_PRESENCE_WINDOW_MINUTES} minutes. Agree who
            should tap score updates so totals don&apos;t fight each other.
          </span>
        </div>
      ) : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr),minmax(200px,260px)] lg:items-start">
        <div className="min-w-0 space-y-4">
          <LiveSessionActiveCard
            session={session}
            signedIn={signedIn}
            viewer={viewer}
            onRefresh={refresh}
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
