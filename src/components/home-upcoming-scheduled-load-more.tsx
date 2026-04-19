"use client";

import { useRef, useState } from "react";
import { UpcomingScheduledSection } from "@/components/upcoming-scheduled-section";
import type { LiveSessionClientRow } from "@/lib/live-session-types";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 5;

export function HomeUpcomingScheduledLoadMore({
  initialSessions,
}: {
  initialSessions: LiveSessionClientRow[];
}) {
  const [sessions, setSessions] = useState(initialSessions);
  const nextOffsetRef = useRef(initialSessions.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialSessions.length >= PAGE_SIZE);

  async function loadMore() {
    setLoading(true);
    try {
      const offset = nextOffsetRef.current;
      const url = new URL("/api/live-sessions/scheduled", window.location.origin);
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("limit", String(PAGE_SIZE));

      const res = await fetch(url.toString(), { cache: "no-store", method: "GET" });
      if (!res.ok) return;
      const data = (await res.json()) as { sessions?: LiveSessionClientRow[] };
      const next = data.sessions ?? [];
      nextOffsetRef.current = offset + next.length;
      setSessions((prev) => [...prev, ...next]);
      setHasMore(next.length >= PAGE_SIZE);
    } finally {
      setLoading(false);
    }
  }

  if (initialSessions.length === 0) {
    return <UpcomingScheduledSection sessions={[]} />;
  }

  return (
    <div className="space-y-2">
      <UpcomingScheduledSection sessions={sessions} />
      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" type="button" onClick={loadMore} disabled={loading}>
            {loading ? "Loading…" : "Load more…"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
