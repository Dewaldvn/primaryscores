"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SEARCH_DEBOUNCE_MS = 250;

type SchoolHit = {
  id: string;
  displayName: string;
  slug: string;
  town: string | null;
};

export function AdminTeamsSchoolSearch({
  initialValue,
  selectedSchoolId,
}: {
  initialValue: string;
  selectedSchoolId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [query, setQuery] = useState(initialValue);
  const [hits, setHits] = useState<SchoolHit[]>([]);
  const [loadingHits, setLoadingHits] = useState(false);

  useEffect(() => {
    setQuery(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const current = (searchParams.get("school") ?? "").trim();
      const next = query.trim();
      if (next === current) return;

      const params = new URLSearchParams(searchParams.toString());
      if (next.length > 0) {
        params.set("school", next);
      } else {
        params.delete("school");
      }
      // Typing starts a new school search context; explicit school selection sets this back.
      params.delete("schoolId");

      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(t);
  }, [pathname, query, router, searchParams]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoadingHits(false);
      return;
    }
    let cancelled = false;
    setLoadingHits(true);
    void fetch(`/api/schools/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json() as Promise<SchoolHit[]>)
      .then((rows) => {
        if (!cancelled) setHits(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setHits([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingHits(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  const activeSchoolId = selectedSchoolId?.trim() || "";

  function selectSchool(hit: SchoolHit) {
    setQuery(hit.displayName);
    const params = new URLSearchParams(searchParams.toString());
    params.set("school", hit.displayName);
    params.set("schoolId", hit.id);
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  function clearAll() {
    setQuery("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("school");
    params.delete("schoolId");
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    });
  }

  return (
    <div className="grid gap-2 sm:max-w-2xl">
      <Label htmlFor="school-search">Search by school name</Label>
      <div className="flex gap-2">
        <Input
          id="school-search"
          name="school"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Type school name"
          autoComplete="off"
        />
        {query ? (
          <Button type="button" variant="outline" size="sm" onClick={clearAll}>
            Clear
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">
        {isPending || loadingHits
          ? "Searching..."
          : "Select a school below to view all teams grouped by sport and age."}
      </p>
      {hits.length > 0 ? (
        <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
          {hits.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
              <div>
                <div className="font-medium">{s.displayName}</div>
                {s.town ? <div className="text-xs text-muted-foreground">{s.town}</div> : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant={activeSchoolId === s.id ? "default" : "secondary"}
                onClick={() => selectSchool(s)}
              >
                {activeSchoolId === s.id ? "Selected" : "Select"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
