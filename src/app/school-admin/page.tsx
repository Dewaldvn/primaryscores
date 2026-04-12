import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LinkButton } from "@/components/link-button";
import { getProfile } from "@/lib/auth";
import { listMembershipsForProfile } from "@/lib/data/school-admin-dashboard";
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

  const memberships = await listMembershipsForProfile(profile.id);
  const active = memberships.filter((m) => m.status === "ACTIVE");
  const pending = memberships.filter((m) => m.status === "PENDING");

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
          <CardTitle className="text-base">Active schools</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {active.length === 0 ? (
            <p className="text-muted-foreground">
              No approved school yet. Use Link a school after your account has the School Admin role.
            </p>
          ) : (
            <ul className="space-y-2">
              {active.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
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
                </li>
              ))}
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
