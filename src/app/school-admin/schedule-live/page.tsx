import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolAdminScheduleLiveForm } from "@/components/school-admin-schedule-live-form";
import { getProfile } from "@/lib/auth";
import { adminListTeamsForSchoolIds } from "@/lib/data/admin";
import { listLiveSessionsByCreator } from "@/lib/data/live-sessions";
import { getActiveManagedSchoolIds } from "@/lib/school-admin-access";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { format } from "date-fns";

export default async function SchoolAdminScheduleLivePage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const profile = await getProfile();
  if (!profile || profile.role !== "SCHOOL_ADMIN") {
    redirect("/login");
  }

  const managed = await getActiveManagedSchoolIds(profile.id);
  if (managed.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Schedule live game</h1>
        <p className="text-sm text-muted-foreground">Approve a school link before scheduling live games.</p>
      </div>
    );
  }

  const teamRows = await adminListTeamsForSchoolIds(managed);
  const homeTeamOptions = teamRows.map((r) => ({
    id: r.team.id,
    schoolId: r.schoolId,
    schoolName: r.schoolName,
    label: `${r.schoolName} · ${r.team.sport} ${r.team.ageGroup} ${r.team.teamLabel}${r.team.gender ? ` ${r.team.gender}` : ""}`,
  }));

  const recent = await listLiveSessionsByCreator(profile.id, 15);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Schedule live game</h1>
        <p className="text-sm text-muted-foreground">
          Pick your home team, search for the opponent, and set when the crowd scoreboard should open. Same sport
          required; hockey away side must match boys or girls.
        </p>
      </div>

      {homeTeamOptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add teams under <a href="/school-admin/teams">Teams</a> first.
        </p>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>New scoreboard</CardTitle>
          </CardHeader>
          <CardContent>
            <SchoolAdminScheduleLiveForm homeTeamOptions={homeTeamOptions} />
          </CardContent>
        </Card>
      )}

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
                      {s.status === "SCHEDULED" && gl
                        ? ` · opens ${format(gl, "dd MMM yyyy HH:mm")}`
                        : null}{" "}
                      ·{" "}
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
