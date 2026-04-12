"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolLogo } from "@/components/school-logo";
import type { SchoolListRow } from "@/components/find-school-client";
import { ContributorAddTeamForm, ContributorNewSchoolForm } from "@/components/contributor-school-team-forms";

const SEARCH_DEBOUNCE_MS = 350;

type ProvinceRow = { id: string; name: string };

type Phase =
  | { step: "search" }
  | { step: "new-school" }
  | {
      step: "team";
      school: { id: string; displayName: string; slug: string };
      /** True for a school you just added, or a search hit that has no crest yet. */
      allowSchoolLogoUpload: boolean;
    };

export function AddTeamWizard({
  provinces,
  initialSearchQuery = "",
  newSchoolPrefill = "",
}: {
  provinces: ProvinceRow[];
  /** Deep-link from moderation etc.: pre-fills directory search. */
  initialSearchQuery?: string;
  /** Pre-fills display/official name when user opens “add new school”. */
  newSchoolPrefill?: string;
}) {
  const [phase, setPhase] = useState<Phase>({ step: "search" });

  const [q, setQ] = useState(initialSearchQuery);
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
        const res = await fetch(`/api/schools/search?q=${encodeURIComponent(debounced)}`, { cache: "no-store" });
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
  }, [debounced]);

  function selectSchool(row: SchoolListRow) {
    const allowSchoolLogoUpload = !row.logoPath?.trim();
    setPhase({
      step: "team",
      school: { id: row.id, displayName: row.displayName, slug: row.slug },
      allowSchoolLogoUpload,
    });
  }

  if (phase.step === "team") {
    const { school, allowSchoolLogoUpload } = phase;
    return (
      <ContributorAddTeamForm
        school={school}
        returnTo="add-team"
        showBack
        onBack={() => setPhase({ step: "search" })}
        allowSchoolLogoUpload={allowSchoolLogoUpload}
      />
    );
  }

  if (phase.step === "new-school") {
    return (
      <ContributorNewSchoolForm
        provinces={provinces}
        defaultDisplayName={newSchoolPrefill || q.trim()}
        defaultOfficialName={newSchoolPrefill || q.trim()}
        returnTo="add-team"
        showBack
        onBack={() => setPhase({ step: "search" })}
        onSuccess={(s, meta) =>
          setPhase({
            step: "team",
            school: s,
            allowSchoolLogoUpload: !meta.logoUploaded,
          })
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Find your school</CardTitle>
        <CardDescription>
          Search the directory first. If it is already here, select it and add the missing team. If not, add the school,
          then the team.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <Label htmlFor="add-team-q">Search by name</Label>
          <div className="relative max-w-xl">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="add-team-q"
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
            <p className="text-sm text-muted-foreground">No schools match that search.</p>
          ) : null}
          {hits.length > 0 ? (
            <ul className="max-w-2xl divide-y rounded-lg border bg-card">
              {hits.map((row) => (
                <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <SchoolLogo logoPath={row.logoPath} alt="" size="xs" className="shrink-0" />
                    <div className="min-w-0">
                      <span className="font-medium">{row.displayName}</span>
                      <span className="block text-xs text-muted-foreground">
                        {row.provinceName}
                        {row.town ? ` · ${row.town}` : ""}
                      </span>
                    </div>
                  </div>
                  <Button type="button" size="sm" variant="secondary" onClick={() => selectSchool(row)}>
                    This is my school
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="border-t pt-4">
          <Button type="button" variant="outline" onClick={() => setPhase({ step: "new-school" })}>
            My school is not listed — add it
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
