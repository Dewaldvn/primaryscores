"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestSchoolAdminMembershipAction } from "@/actions/school-admin-membership";

type SchoolHit = { id: string; displayName: string; slug: string; town: string | null };

export function SchoolAdminClaimForm() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [hits, setHits] = useState<SchoolHit[]>([]);
  const [loading, setLoading] = useState(false);
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
        if (!cancelled) setHits([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debounced]);

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
                variant="secondary"
                disabled={pending}
                onClick={() => {
                  start(async () => {
                    const res = await requestSchoolAdminMembershipAction({ schoolId: s.id });
                    if (!res.ok) {
                      toast.error("error" in res ? res.error : "Request failed");
                      return;
                    }
                    toast.success("Request sent. A moderator will review it.");
                    router.push("/school-admin");
                    router.refresh();
                  });
                }}
              >
                Request link
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
