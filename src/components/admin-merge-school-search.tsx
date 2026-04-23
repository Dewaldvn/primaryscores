"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const SEARCH_DEBOUNCE_MS = 250;

export function AdminMergeSchoolSearch({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [q, setQ] = useState(initialValue);

  useEffect(() => {
    setQ(initialValue);
  }, [initialValue]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      const current = (searchParams.get("q") ?? "").trim();
      const next = q.trim();
      if (current === next) return;

      const params = new URLSearchParams(searchParams.toString());
      if (next.length > 0) params.set("q", next);
      else params.delete("q");
      const qs = params.toString();
      startTransition(() => {
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [pathname, q, router, searchParams]);

  return (
    <div className="grid gap-2 sm:max-w-xl">
      <Label htmlFor="merge-school-search">Search schools by name or nickname</Label>
      <div className="flex gap-2">
        <Input
          id="merge-school-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Type school name or nickname"
          autoComplete="off"
        />
        {q ? (
          <Button type="button" variant="outline" size="sm" onClick={() => setQ("")}>
            Clear
          </Button>
        ) : null}
      </div>
      <p className="text-xs text-muted-foreground">{isPending ? "Searching..." : "Results update as you type."}</p>
    </div>
  );
}
