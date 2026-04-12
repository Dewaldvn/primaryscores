"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LinkButton } from "@/components/link-button";
import { SchoolLogo } from "@/components/school-logo";
import { Card, CardContent } from "@/components/ui/card";
import { FindSchoolNoResultsAdd } from "@/components/find-school-no-results-add";
import type { SchoolSport } from "@/lib/sports";
import type { TeamGender } from "@/lib/team-gender";

export type ProvinceRow = { id: string; name: string };

export type SchoolListRow = {
  id: string;
  displayName: string;
  slug: string;
  town: string | null;
  provinceName: string;
  logoPath: string | null;
  u13TeamId: string | null;
};

const SEARCH_DEBOUNCE_MS = 350;

export function FindSchoolClient({
  provinces,
  schoolsInProvince,
  selectedProvinceId,
  selectedProvinceName,
  searchSport,
  searchGender,
  signedIn,
}: {
  provinces: ProvinceRow[];
  schoolsInProvince: SchoolListRow[];
  selectedProvinceId: string | null;
  selectedProvinceName: string | null;
  /** When set, name search uses `/api/schools/search` with this sport (any age group for that sport). */
  searchSport?: SchoolSport;
  /** With hockey, narrows school search to boys or girls teams. */
  searchGender?: TeamGender;
  signedIn: boolean;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [hits, setHits] = useState<SchoolListRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim()), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (debounced.length < 2) {
      setHits([]);
      setErr(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      try {
        const sportQ = searchSport ? `&sport=${encodeURIComponent(searchSport)}` : "";
        const genderQ = searchGender ? `&gender=${encodeURIComponent(searchGender)}` : "";
        const res = await fetch(`/api/schools/search?q=${encodeURIComponent(debounced)}${sportQ}${genderQ}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as SchoolListRow[] | unknown;
        if (cancelled) return;
        if (!res.ok) {
          setHits([]);
          setErr("Search failed. Try again.");
          return;
        }
        setHits(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setHits([]);
          setErr("Search failed. Try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [debounced, searchSport, searchGender]);

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <label className="text-sm font-medium" htmlFor="find-school-q">
          Search by name
        </label>
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="find-school-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Type at least two letters…"
            className="pl-9"
            autoComplete="off"
          />
        </div>
        {debounced.length > 0 && debounced.length < 2 ? (
          <p className="text-sm text-muted-foreground">Enter at least two characters to search.</p>
        ) : null}
        {loading ? <p className="text-sm text-muted-foreground">Searching…</p> : null}
        {err ? <p className="text-sm text-destructive">{err}</p> : null}
        {debounced.length >= 2 && !loading && !err && hits.length === 0 ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">No schools match that search.</p>
            <FindSchoolNoResultsAdd key={debounced} nameHint={debounced} provinces={provinces} signedIn={signedIn} />
          </div>
        ) : null}
        {hits.length > 0 ? (
          <ul className="max-w-2xl divide-y rounded-lg border bg-card">
            {hits.map((s) => (
              <li key={s.id}>
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm hover:bg-muted/60">
                  <Link href={`/schools/${s.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
                    <SchoolLogo logoPath={s.logoPath} alt="" size="sm" />
                    <span>
                      <span className="font-medium">{s.displayName}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {s.town ? `${s.town} · ` : ""}
                        {s.provinceName}
                      </span>
                    </span>
                  </Link>
                  <Link
                    href={`/schools/${s.slug}#teams`}
                    className="shrink-0 text-xs text-primary underline-offset-4 hover:underline"
                  >
                    Teams →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Browse by province</h2>
        <p className="text-sm text-muted-foreground">Pick a province to list schools alphabetically.</p>
        <div className="flex flex-wrap gap-2">
          {provinces.map((p) => {
            const qs = new URLSearchParams();
            qs.set("province", p.id);
            if (searchSport) qs.set("sport", searchSport);
            if (searchGender) qs.set("gender", searchGender);
            return (
              <LinkButton
                key={p.id}
                variant={selectedProvinceId === p.id ? "default" : "outline"}
                size="sm"
                href={`/find-school?${qs.toString()}`}
              >
                {p.name}
              </LinkButton>
            );
          })}
        </div>
      </section>

      {selectedProvinceId ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">
            Schools in {selectedProvinceName ?? "this province"}
          </h2>
          {schoolsInProvince.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active schools found for this province.</p>
          ) : (
            <Card>
              <CardContent className="max-h-[min(28rem,70vh)] overflow-y-auto p-0">
                <ul className="divide-y">
                  {schoolsInProvince.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/schools/${s.slug}`}
                        className="flex items-center gap-3 px-3 py-2.5 text-sm hover:bg-muted/60"
                      >
                        <SchoolLogo logoPath={s.logoPath} alt="" size="sm" />
                        <span className="font-medium">{s.displayName}</span>
                        {s.town ? <span className="text-muted-foreground">{s.town}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </section>
      ) : null}

      <p className="text-sm text-muted-foreground">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          ← Back to home
        </Link>
      </p>
    </div>
  );
}
