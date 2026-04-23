import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/link-button";
import { adminListSchoolAdminOverview } from "@/lib/data/admin";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function AdminSchoolAdminsPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }

  const overview = await adminListSchoolAdminOverview();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">School admins</h1>
          <p className="text-sm text-muted-foreground">
            Profiles with the school admin role, their school memberships, and teams linked to their account.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/admin/schools" variant="outline" size="sm">
            Schools directory
          </LinkButton>
          <LinkButton href="/admin/teams" variant="outline" size="sm">
            Teams directory
          </LinkButton>
        </div>
      </div>

      {overview.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No users with the <span className="font-medium text-foreground">SCHOOL_ADMIN</span> role yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {overview.map(({ profile, memberships, teamLinks }) => (
            <Card key={profile.id}>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{profile.displayName}</CardTitle>
                <CardDescription className="break-all">{profile.email}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">School memberships</h3>
                  {memberships.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No membership rows.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>School</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[1%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {memberships.map((m) => (
                            <TableRow key={m.membershipId}>
                              <TableCell>{m.schoolName}</TableCell>
                              <TableCell>{m.status}</TableCell>
                              <TableCell>
                                <Link
                                  href={`/admin/schools/${m.schoolId}`}
                                  className="text-primary text-sm underline-offset-4 hover:underline"
                                >
                                  Open
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Linked teams</h3>
                  {teamLinks.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No profile–team links.</p>
                  ) : (
                    <div className="overflow-x-auto rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>School</TableHead>
                            <TableHead>Sport</TableHead>
                            <TableHead>Age group</TableHead>
                            <TableHead>Team</TableHead>
                            <TableHead className="w-[1%]"></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teamLinks.map((t) => (
                            <TableRow key={t.teamId}>
                              <TableCell>{t.schoolName}</TableCell>
                              <TableCell>{t.sport}</TableCell>
                              <TableCell>{t.ageGroup}</TableCell>
                              <TableCell>
                                {t.teamLabel}
                                {t.gender ? ` · ${t.gender}` : ""}
                              </TableCell>
                              <TableCell>
                                <Link
                                  href={`/admin/teams/${t.teamId}`}
                                  className="text-primary text-sm underline-offset-4 hover:underline"
                                >
                                  Open
                                </Link>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
