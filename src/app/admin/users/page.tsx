import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AdminAddUserForm } from "@/components/admin-add-user-form";
import { AdminUsersTable } from "@/components/admin-users-table";
import { adminListProfiles } from "@/lib/data/admin";
import { cn } from "@/lib/utils";
import { isDatabaseConfigured } from "@/lib/db-safe";
import type { ProfileRole } from "@/lib/auth";

type PageProps = { searchParams: Record<string, string | string[] | undefined> };

const ROLES: readonly ProfileRole[] = ["CONTRIBUTOR", "MODERATOR", "ADMIN", "SCHOOL_ADMIN"];

function qp(sp: PageProps["searchParams"], key: string): string {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
}

function parseInitialRole(v: string): "ALL" | ProfileRole {
  if (!v) return "ALL";
  return ROLES.includes(v as ProfileRole) ? (v as ProfileRole) : "ALL";
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  if (!isDatabaseConfigured()) {
    return <p className="text-sm text-muted-foreground">Configure DATABASE_URL first.</p>;
  }
  const profiles = await adminListProfiles();
  const initialQuery = qp(searchParams, "q");
  const initialRole = parseInitialRole(qp(searchParams, "role"));

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-sm text-muted-foreground">
          Search and manage roles, or add an account. Creating users requires{" "}
          <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> in the environment.
        </p>
        <a
          href="#add-user"
          className={cn(
            buttonVariants({ variant: "default", size: "default" }),
            "inline-flex w-fit",
          )}
        >
          Add user
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All users</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <AdminUsersTable
            rows={profiles.map((p) => ({
              id: p.id,
              email: p.email,
              displayName: p.displayName,
              role: p.role,
              bannedAt: p.bannedAt ?? null,
            }))}
            initialQuery={initialQuery}
            initialRole={initialRole}
          />
        </CardContent>
      </Card>

      <Card id="add-user" className="scroll-mt-24">
        <CardHeader>
          <CardTitle>Add user</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminAddUserForm />
        </CardContent>
      </Card>
    </div>
  );
}
