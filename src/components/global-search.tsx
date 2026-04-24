"use client";

import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { format } from "date-fns";
import {
  Search,
  Loader2,
  School,
  Trophy,
  CalendarDays,
  ListFilter,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { SchoolLogo } from "@/components/school-logo";
import { SuperSportsRecordingLink } from "@/components/super-sports-recording-link";
import { SCORE_DUMMY_RESULT_BG_CLASS } from "@/lib/score-result-frame";

type SearchPayload = {
  schools: {
    id: string;
    displayName: string;
    slug: string;
    town: string | null;
    provinceName: string;
    logoPath: string | null;
    u13TeamId: string | null;
  }[];
  competitions: { id: string; name: string; provinceName: string | null }[];
  seasons: { id: string; name: string; year: number }[];
  matchedProvinces: { id: string; name: string }[];
  provinceGames: {
    resultId: string;
    fixtureId: string;
    homeScore: number;
    awayScore: number;
    isDummy: boolean;
    matchDate: string;
    homeSchoolName: string;
    awaySchoolName: string;
    homeSchoolSlug: string;
    awaySchoolSlug: string;
    homeSchoolLogoPath: string | null;
    awaySchoolLogoPath: string | null;
    competitionName: string | null;
    seasonName: string | null;
    provinceName: string | null;
    recordingUrl: string | null;
  }[];
};

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

const GlobalSearchContext = createContext<(() => void) | null>(null);

export function GlobalSearchProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSearch = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <GlobalSearchContext.Provider value={openSearch}>
      {children}
      {open ? <GlobalSearchFloating open={open} onClose={() => setOpen(false)} /> : null}
    </GlobalSearchContext.Provider>
  );
}

const triggerClass = "text-muted-foreground hover:text-foreground";

export function GlobalSearchOpenButton({
  className,
  title = "Search",
}: {
  className?: string;
  title?: string;
}) {
  const openSearch = useContext(GlobalSearchContext);
  if (!openSearch) {
    throw new Error("GlobalSearchOpenButton must be used inside GlobalSearchProvider");
  }
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className={cn(triggerClass, className)}
      aria-label="Open search"
      title={title}
      onClick={openSearch}
    >
      <Search className="size-4" />
    </Button>
  );
}

function GlobalSearchFloating({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const debounced = useDebounced(query, 280);
  const [data, setData] = useState<SearchPayload | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const t = requestAnimationFrame(() => inputRef.current?.focus());
    return () => cancelAnimationFrame(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = debounced.trim();
    if (q.length < 2) {
      setData({
        schools: [],
        competitions: [],
        seasons: [],
        matchedProvinces: [],
        provinceGames: [],
      });
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => r.json() as Promise<SearchPayload>)
      .then((j) => {
        if (!cancelled) {
          setData({
            schools: j.schools ?? [],
            competitions: j.competitions ?? [],
            seasons: j.seasons ?? [],
            matchedProvinces: j.matchedProvinces ?? [],
            provinceGames: j.provinceGames ?? [],
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData({
            schools: [],
            competitions: [],
            seasons: [],
            matchedProvinces: [],
            provinceGames: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setData(null);
      setLoading(false);
    }
  }, [open]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) {
        onClose();
      }
    };
    if (open) {
      document.addEventListener("mousedown", onDoc);
      return () => document.removeEventListener("mousedown", onDoc);
    }
  }, [open, onClose]);

  if (!open) return null;

  const q = debounced.trim();
  const hasResults =
    data &&
    (data.schools.length > 0 ||
      data.competitions.length > 0 ||
      data.seasons.length > 0 ||
      data.matchedProvinces.length > 0 ||
      data.provinceGames.length > 0);
  const archiveHref =
    q.length >= 2 ? `/results?search=${encodeURIComponent(q)}` : "/results";

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-[100] cursor-default bg-black/40 supports-[backdrop-filter]:backdrop-blur-[2px]"
        aria-label="Close search"
        onClick={onClose}
      />
      <div className="fixed inset-x-0 top-14 z-[101] flex justify-center px-3 sm:top-16 sm:px-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="flex max-h-[min(85vh,40rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10"
        >
          <div className="border-b p-3">
            <p id={titleId} className="sr-only">
              Global search
            </p>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Click to search..."
                className="h-10 border-0 bg-transparent pl-9 pr-10 shadow-none focus-visible:ring-0"
                autoComplete="off"
                aria-autocomplete="list"
              />
              {loading ? (
                <Loader2 className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              ) : null}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {q.length > 0 && q.length < 2 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                Keep typing…
              </p>
            ) : null}
            {q.length >= 2 && !loading && data && !hasResults ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">
                No matches. Try another term or use the results archive below.
              </p>
            ) : null}

            {data && data.matchedProvinces.length > 0 ? (
              <section className="mb-3">
                <h3 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <MapPin className="size-3.5" />
                  {data.matchedProvinces.length === 1
                    ? `Games in ${data.matchedProvinces[0].name}`
                    : `Games in matching provinces`}
                </h3>
                {data.matchedProvinces.length > 1 ? (
                  <p className="px-2 pb-2 text-xs text-muted-foreground">
                    {data.matchedProvinces.map((p) => p.name).join(" · ")}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                  {data.matchedProvinces.map((p) => (
                    <Link
                      key={p.id}
                      href={`/results?province=${p.id}`}
                      onClick={onClose}
                      className="rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-medium hover:bg-muted"
                    >
                      All results in {p.name}
                    </Link>
                  ))}
                </div>
                {data.provinceGames.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-muted-foreground">
                    No verified games for competitions linked to{" "}
                    {data.matchedProvinces.length === 1 ? "this province" : "these provinces"} yet.
                  </p>
                ) : (
                  <ul className="space-y-0.5">
                    {data.provinceGames.map((g) => (
                      <li key={g.resultId} className="relative">
                        <Link
                          href={`/matches/${g.fixtureId}`}
                          onClick={onClose}
                          className="absolute inset-0 z-[1] rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-popover"
                          aria-label={`Match: ${g.homeSchoolName} versus ${g.awaySchoolName}`}
                        >
                          <span className="sr-only">
                            Open match {g.homeSchoolName} vs {g.awaySchoolName}
                          </span>
                        </Link>
                        <div
                          className={cn(
                            "pointer-events-none relative z-[2] rounded-md px-2 py-2 text-sm hover:bg-muted/80",
                            g.isDummy && SCORE_DUMMY_RESULT_BG_CLASS
                          )}
                        >
                          <span className="font-medium tabular-nums">
                            {g.homeScore} – {g.awayScore}
                          </span>
                          <span className="mx-1.5 text-muted-foreground">·</span>
                          <span className="inline-flex items-center gap-1.5">
                            <SchoolLogo logoPath={g.homeSchoolLogoPath} alt="" size="xs" />
                            {g.homeSchoolName}
                          </span>
                          <span className="text-muted-foreground"> vs </span>
                          <span className="inline-flex items-center gap-1.5">
                            <SchoolLogo logoPath={g.awaySchoolLogoPath} alt="" size="xs" />
                            {g.awaySchoolName}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {[g.competitionName, g.seasonName].filter(Boolean).join(" · ") || "—"}
                            {g.matchDate
                              ? ` · ${format(new Date(`${g.matchDate}T12:00:00`), "d MMM yyyy")}`
                              : null}
                          </span>
                          {g.recordingUrl ? (
                            <SuperSportsRecordingLink
                              href={g.recordingUrl}
                              className="pointer-events-auto relative z-[3] mt-1 block text-xs"
                            />
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {data.provinceGames.length >= 50 ? (
                  <p className="px-2 pt-1 text-xs text-muted-foreground">
                    Showing the 50 most recent. Use &quot;All results in …&quot; for the full list.
                  </p>
                ) : null}
              </section>
            ) : null}

            {data && data.schools.length > 0 ? (
              <section className="mb-3">
                <h3 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <School className="size-3.5" />
                  Schools
                </h3>
                <ul className="space-y-0.5">
                  {data.schools.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/schools/${s.slug}`}
                        onClick={onClose}
                        className="flex items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
                      >
                        <SchoolLogo logoPath={s.logoPath} alt="" size="xs" className="mt-0.5" />
                        <span>
                          <span className="font-medium">{s.displayName}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {[s.town, s.provinceName].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data && data.competitions.length > 0 ? (
              <section className="mb-3">
                <h3 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <Trophy className="size-3.5" />
                  Competitions
                </h3>
                <ul className="space-y-0.5">
                  {data.competitions.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/competitions/${c.id}`}
                        onClick={onClose}
                        className="block rounded-md px-2 py-2 text-sm hover:bg-muted"
                      >
                        {c.name}
                        {c.provinceName ? (
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {c.provinceName}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {data && data.seasons.length > 0 ? (
              <section className="mb-3">
                <h3 className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  <CalendarDays className="size-3.5" />
                  Seasons
                </h3>
                <ul className="space-y-0.5">
                  {data.seasons.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/seasons/${s.id}`}
                        onClick={onClose}
                        className="block rounded-md px-2 py-2 text-sm hover:bg-muted"
                      >
                        {s.name}{" "}
                        <span className="text-muted-foreground">({s.year})</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>

          <div className="border-t p-2">
            <Link
              href={archiveHref}
              onClick={onClose}
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "h-auto w-full justify-start gap-2 px-3 py-2.5 font-normal whitespace-normal"
              )}
            >
              <ListFilter className="size-4 shrink-0" />
              <span className="text-left text-sm">
                {q.length >= 2 ? (
                  <>
                    Search verified <strong className="font-medium">results</strong> for &quot;{q}&quot;
                  </>
                ) : (
                  <>Browse all verified results</>
                )}
              </span>
            </Link>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
