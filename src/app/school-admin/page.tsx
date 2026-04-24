import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { getProfile } from "@/lib/auth";
import { listMembershipsForProfile } from "@/lib/data/school-admin-dashboard";
import { listActiveTeamsForSchoolIds } from "@/lib/data/schools";
import { formatTeamListingSubtitle } from "@/lib/format-team";
import type { SchoolSport } from "@/lib/sports";
import { compareTeamsBySportAndChronologicalAge } from "@/lib/team-sort";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { cancelSchoolAdminMembershipFormAction } from "@/actions/school-admin-membership";

export default async function SchoolAdminHomePage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const profile = await getProfile();
  if (!profile || profile.role !== "SCHOOL_ADMIN") {
    redirect("/login");
  }

  let active: Awaited<ReturnType<typeof listMembershipsForProfile>>;
  let pending: Awaited<ReturnType<typeof listMembershipsForProfile>>;
  const teamsBySchool = new Map<string, Awaited<ReturnType<typeof listActiveTeamsForSchoolIds>>>();

  try {
    const memberships = await listMembershipsForProfile(profile.id);
    const activeList = memberships.filter((m) => m.status === "ACTIVE");
    const pendingList = memberships.filter((m) => m.status === "PENDING");
    active = activeList;
    pending = pendingList;

    const activeSchoolIds = activeList.map((m) => m.schoolId);
    const teams =
      activeSchoolIds.length > 0 ? await listActiveTeamsForSchoolIds(activeSchoolIds) : [];
    for (const t of teams) {
      const arr = teamsBySchool.get(t.schoolId) ?? [];
      arr.push(t);
      teamsBySchool.set(t.schoolId, arr);
    }
    teamsBySchool.forEach((arr) => {
      arr.sort((a, b) =>
        compareTeamsBySportAndChronologicalAge(
          {
            sport: a.sport as SchoolSport,
            ageGroup: a.ageGroup,
            gender: a.gender,
            teamLabel: a.teamLabel,
          },
          {
            sport: b.sport as SchoolSport,
            ageGroup: b.ageGroup,
            gender: b.gender,
            teamLabel: b.teamLabel,
          },
        ),
      );
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return (
      <div className="space-y-3 rounded-md border border-destructive/50 bg-destructive/5 p-4 text-sm">
        <h1 className="text-lg font-semibold text-destructive">Could not load school admin</h1>
        <p className="text-muted-foreground">
          The database request failed. Check that <code className="text-xs">DATABASE_URL</code> is correct, the
          Supabase project is running, and migrations are applied. Details:{" "}
          <span className="whitespace-pre-wrap break-words font-mono text-xs text-foreground">{msg}</span>
        </p>
        <p className="text-muted-foreground">
          If you use the <strong>transaction pooler</strong> (port 6543), the database user must be{" "}
          <code className="text-xs">postgres.&lt;project-ref&gt;</code>, not <code className="text-xs">postgres</code>{" "}
          alone.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">School admin</h1>
        <p className="text-sm text-muted-foreground">
          Manage teams and published scores for schools you are linked to. Request a link from{" "}
          <Link href="/school-admin/claim" className="text-primary underline">
            Link a school
          </Link>
          ; a moderator must approve it before tools unlock for that school.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active teams</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {active.length === 0 ? (
            <p className="text-muted-foreground">
              No approved school yet. Use Link a school after your account has the School Admin role.
            </p>
          ) : (
            <ul className="space-y-2">
              {active.map((m) => {
                const schoolTeams = teamsBySchool.get(m.schoolId) ?? [];
                return (
                  <li key={m.id} className="rounded-md border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-medium">{m.schoolDisplayName}</span>
                      <div className="flex flex-wrap gap-2">
                        <LinkButton variant="outline" size="sm" href={`/school-admin/school/${m.schoolId}`}>
                          School & logo
                        </LinkButton>
                        <LinkButton
                          variant="outline"
                          size="sm"
                          href={`/school-admin/teams/new?schoolId=${m.schoolId}`}
                        >
                          Add team
                        </LinkButton>
                      </div>
                    </div>
                    {schoolTeams.length > 0 ? (
                      <div className="mt-3 space-y-2 border-t pt-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Active teams
                        </p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          {schoolTeams.map((t) => (
                            <li key={t.id}>
                              {formatTeamListingSubtitle({
                                sport: t.sport as SchoolSport,
                                ageGroup: t.ageGroup,
                                teamLabel: t.teamLabel,
                                gender: t.gender,
                              })}
                              {t.teamNickname ? (
                                <span className="text-muted-foreground"> · {t.teamNickname}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                        <Link
                          href="/school-admin/teams"
                          className="inline-block text-sm font-medium text-primary hover:underline"
                        >
                          Edit teams
                        </Link>
                      </div>
                    ) : (
                      <div className="mt-3 border-t pt-3">
                        <p className="mb-2 text-sm text-muted-foreground">No active teams on record yet.</p>
                        <Link
                          href="/school-admin/teams"
                          className="text-sm font-medium text-primary hover:underline"
                        >
                          Edit teams
                        </Link>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pending requests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {pending.length === 0 ? (
            <p className="text-muted-foreground">No pending requests.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
                >
                  <div>
                    <div className="font-medium">{m.schoolDisplayName}</div>
                    <div className="text-xs text-muted-foreground">Awaiting moderator review</div>
                  </div>
                  <form action={cancelSchoolAdminMembershipFormAction}>
                    <input type="hidden" name="membershipId" value={m.id} />
                    <Button type="submit" variant="ghost" size="sm">
                      Cancel request
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
