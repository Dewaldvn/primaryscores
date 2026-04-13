"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { submitSchoolAdminClaimFormAction } from "@/actions/school-admin-membership";

type SchoolHit = { id: string; displayName: string; slug: string; town: string | null };
type Feedback = { kind: "error" | "success"; text: string } | null;

export function SchoolAdminClaimForm({
  provinces,
}: {
  provinces: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [hits, setHits] = useState<SchoolHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewSchool, setShowNewSchool] = useState(false);
  const [letter, setLetter] = useState<File | null>(null);
  const [selectedSchool, setSelectedSchool] = useState<SchoolHit | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    if (debounced.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void fetch(`/api/schools/search?q=${encodeURIComponent(debounced)}`)
      .then((r) => r.json() as Promise<SchoolHit[]>)
      .then((rows) => {
        if (!cancelled) setHits(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) {
          setHits([]);
          setFeedback({ kind: "error", text: "Could not search schools right now. Please try again." });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

  function submitSelectedSchoolClaim() {
    if (!selectedSchool) {
      setFeedback({ kind: "error", text: "Select a school first, then submit your claim." });
      return;
    }
    if (!letter) {
      setFeedback({ kind: "error", text: "Upload a request letter before submitting your claim." });
      return;
    }
    setFeedback(null);
    start(async () => {
      const fd = new FormData();
      fd.set("mode", "existing");
      fd.set("schoolId", selectedSchool.id);
      fd.set("letter", letter);
      const res = await submitSchoolAdminClaimFormAction(fd);
      if (!res.ok) {
        setFeedback({
          kind: "error",
          text: "error" in res ? (res.error ?? "Request failed.") : "Request failed.",
        });
        return;
      }
      setFeedback({ kind: "success", text: "Claim submitted for moderation." });
      router.push("/apply-school-admin");
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="school-q">Find your school</Label>
        <Input
          id="school-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type at least 2 letters"
          autoComplete="off"
        />
        <p className="text-xs text-muted-foreground">
          {loading ? "Searching…" : debounced.length < 2 ? "Enter at least 2 characters to search." : null}
        </p>
      </div>

      {hits.length > 0 ? (
        <ul className="max-h-72 space-y-1 overflow-y-auto rounded-md border p-2 text-sm">
          {hits.map((s) => (
            <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
              <div>
                <div className="font-medium">{s.displayName}</div>
                {s.town ? <div className="text-xs text-muted-foreground">{s.town}</div> : null}
              </div>
              <Button
                type="button"
                size="sm"
                variant={selectedSchool?.id === s.id ? "default" : "secondary"}
                disabled={pending}
                onClick={() => {
                  setSelectedSchool(s);
                  setFeedback(null);
                }}
              >
                {selectedSchool?.id === s.id ? "Selected" : "Select school"}
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <div className="space-y-2 rounded-md border p-3">
        <Label htmlFor="claim-letter">Request letter on school letterhead *</Label>
        <Input
          id="claim-letter"
          type="file"
          accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp"
          onChange={(e) => setLetter(e.target.files?.[0] ?? null)}
          disabled={pending}
        />
        <p className="text-xs text-muted-foreground">
          Required before any claim can be sent. PDF or image is recommended.
        </p>
      </div>

      {selectedSchool ? (
        <p className="text-sm text-muted-foreground">
          Selected school: <span className="font-medium text-foreground">{selectedSchool.displayName}</span>
        </p>
      ) : null}

      {feedback ? (
        <div
          className={`rounded-md border px-3 py-2 text-center text-sm ${
            feedback.kind === "error"
              ? "border-destructive/40 bg-destructive/10 text-destructive"
              : "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
          }`}
        >
          {feedback.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button type="button" disabled={pending} onClick={submitSelectedSchoolClaim}>
          Submit my claim
        </Button>
        <Button type="button" variant="outline" onClick={() => setShowNewSchool((v) => !v)}>
          {showNewSchool ? "Cancel adding a new school" : "School not found? Add and claim it"}
        </Button>
      </div>

      {showNewSchool ? (
        <form
          className="grid gap-3 rounded-md border p-3 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!letter) {
              setFeedback({ kind: "error", text: "Upload a request letter before sending your claim." });
              return;
            }
            setFeedback(null);
            start(async () => {
              const fd = new FormData(e.currentTarget);
              fd.set("mode", "new");
              fd.set("letter", letter);
              const res = await submitSchoolAdminClaimFormAction(fd);
              if (!res.ok) {
                setFeedback({
                  kind: "error",
                  text:
                    "error" in res
                      ? (res.error ?? "Could not submit application.")
                      : "Could not submit application.",
                });
                return;
              }
              setFeedback({ kind: "success", text: "Application sent for moderation." });
              router.push("/apply-school-admin");
              router.refresh();
            });
          }}
        >
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="officialName">Official name *</Label>
            <Input id="officialName" name="officialName" required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="displayName">Display name *</Label>
            <Input id="displayName" name="displayName" required />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="provinceId">Province *</Label>
            <select
              id="provinceId"
              name="provinceId"
              required
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              <option value="">Select province…</option>
              {provinces.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="nickname">Nickname (optional)</Label>
            <Input id="nickname" name="nickname" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="town">Town (optional)</Label>
            <Input id="town" name="town" />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="website">Website (optional)</Label>
            <Input id="website" name="website" type="url" />
          </div>
          <Button type="submit" className="sm:col-span-2" disabled={pending}>
            Add school and send claim
          </Button>
        </form>
      ) : null}
    </div>
  );
}
