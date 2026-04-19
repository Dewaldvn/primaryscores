"use client";

import { useRef, useState } from "react";
import {
  RecentVerifiedScoreCards,
  type RecentVerifiedRow,
} from "@/components/recent-verified-score-cards";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 8;

export function HomeRecentVerifiedLoadMore({ initialRows }: { initialRows: RecentVerifiedRow[] }) {
  const [rows, setRows] = useState(initialRows);
  /** DB offset for the next page — must match rows already rendered (stable across updates). */
  const nextOffsetRef = useRef(initialRows.length);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(initialRows.length >= PAGE_SIZE);
  const [loadError, setLoadError] = useState<string | null>(null);

  async function loadMore() {
    setLoading(true);
    setLoadError(null);
    try {
      const offset = nextOffsetRef.current;
      const url = new URL("/api/home/verified-results", window.location.origin);
      url.searchParams.set("offset", String(offset));
      url.searchParams.set("limit", String(PAGE_SIZE));

      const res = await fetch(url.toString(), {
        cache: "no-store",
        method: "GET",
      });
      if (!res.ok) {
        setLoadError("Could not load more results.");
        return;
      }
      const data = (await res.json()) as { rows?: RecentVerifiedRow[] };
      const next = data.rows ?? [];
      nextOffsetRef.current = offset + next.length;
      setRows((prev) => [...prev, ...next]);
      setHasMore(next.length >= PAGE_SIZE);
    } catch {
      setLoadError("Could not load more results.");
    } finally {
      setLoading(false);
    }
  }

  if (rows.length === 0) return null;

  return (
    <div className="space-y-3">
      <RecentVerifiedScoreCards rows={rows} variant="compact" />
      {loadError ? (
        <p className="text-center text-sm text-destructive" role="alert">
          {loadError}
        </p>
      ) : null}
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
