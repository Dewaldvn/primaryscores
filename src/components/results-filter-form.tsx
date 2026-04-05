import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Opt = { id: string; name: string; label?: string };

export function ResultsFilterForm({
  provinces,
  schools,
  seasons,
  competitions,
  initial,
}: {
  provinces: Opt[];
  schools: { id: string; label: string }[];
  seasons: Opt[];
  competitions: Opt[];
  initial: {
    provinceId?: string;
    schoolId?: string;
    seasonId?: string;
    competitionId?: string;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
  };
}) {
  return (
    <form
      className="grid gap-4 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3"
      method="get"
      action="/results"
    >
      <div className="space-y-1.5">
        <Label htmlFor="search">Search</Label>
        <Input
          id="search"
          name="search"
          placeholder="School or competition…"
          defaultValue={initial.search ?? ""}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="province">Province</Label>
        <select
          id="province"
          name="province"
          defaultValue={initial.provinceId ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All provinces</option>
          {provinces.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="school">School</Label>
        <select
          id="school"
          name="school"
          defaultValue={initial.schoolId ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">Any school (home or away)</option>
          {schools.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="season">Season</Label>
        <select
          id="season"
          name="season"
          defaultValue={initial.seasonId ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All seasons</option>
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="competition">Competition</Label>
        <select
          id="competition"
          name="competition"
          defaultValue={initial.competitionId ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="">All competitions</option>
          {competitions.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="from">Match date from</Label>
        <Input id="from" name="from" type="date" defaultValue={initial.dateFrom ?? ""} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="to">Match date to</Label>
        <Input id="to" name="to" type="date" defaultValue={initial.dateTo ?? ""} />
      </div>
      <div className="flex flex-wrap items-end gap-2 sm:col-span-2 lg:col-span-3">
        <Button type="submit">Apply filters</Button>
        <LinkButton variant="ghost" href="/results">
          Clear
        </LinkButton>
      </div>
    </form>
  );
}
