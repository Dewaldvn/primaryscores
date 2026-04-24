import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminScheduleLiveForm } from "@/components/admin-schedule-live-form";
import { getProfile } from "@/lib/auth";
import { adminListCompetitions, adminListSeasons } from "@/lib/data/admin";
import { listLiveSessionsByCreator } from "@/lib/data/live-sessions";
import { isDatabaseConfigured } from "@/lib/db-safe";
import type { SchoolSport } from "@/lib/sports";
import { format } from "date-fns";

export default async function AdminScheduleLivePage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const profile = await getProfile();
  if (!profile || profile.role !== "ADMIN") {
    redirect("/login");
  }

  const [recent, seasons, competitions] = await Promise.all([
    listLiveSessionsByCreator(profile.id, 15),
    adminListSeasons(),
    adminListCompetitions(),
  ]);
  const seasonOptions = seasons.map((r) => ({
    id: r.season.id,
    sport: r.season.sport as SchoolSport,
    label: `${r.season.name} (${r.season.year})${r.provinceName ? ` · ${r.provinceName}` : ""}`,
  }));
  const competitionOptions = competitions.map((r) => ({
    id: r.competition.id,
    sport: r.competition.sport as SchoolSport,
    label: `${r.competition.name}${r.competition.year ? ` (${r.competition.year})` : ""}${
      r.provinceName ? ` · ${r.provinceName}` : ""
    }`,
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Schedule live game</h1>
        <p className="text-sm text-muted-foreground">
          Choose the sport first, then optionally a season or a competition—one only, not both (filtered to that sport).
          Search schools
          and pick teams; hockey away teams match the home side (boys or girls).
        </p>
        <p className="pt-2 text-sm text-muted-foreground">
          <Link href="/admin/scores" className="text-primary underline">
            ← Back to admin scores
          </Link>
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New scoreboard</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminScheduleLiveForm seasonOptions={seasonOptions} competitionOptions={competitionOptions} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your recent boards</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recent.length === 0 ? (
            <p className="text-muted-foreground">None yet.</p>
          ) : (
            <ul className="space-y-2">
              {recent.map((s) => {
                const gl =
                  s.goesLiveAt instanceof Date ? s.goesLiveAt : s.goesLiveAt ? new Date(s.goesLiveAt) : null;
                return (
                  <li key={s.id} className="rounded-md border p-2">
                    <div className="font-medium">
                      {s.homeTeamName} vs {s.awayTeamName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {s.status}
                      {s.status === "SCHEDULED" && gl ? ` · opens ${format(gl, "dd MMM yyyy HH:mm")}` : null} ·{" "}
                      <a href={`/live/${s.id}`} className="text-primary underline">
                        Open
                      </a>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
