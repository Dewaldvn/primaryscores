import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminUsersTable } from "@/components/admin-users-table";
import { adminListProfiles } from "@/lib/data/admin";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function AdminUsersPage() {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const profiles = await adminListProfiles();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Promotion to moderator or admin is done here. New signups default to contributor.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Profiles</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <AdminUsersTable
            rows={profiles.map((p) => ({
              id: p.id,
              email: p.email,
              displayName: p.displayName,
              role: p.role,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
