import { requireRole, requireUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db-safe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

const LOGIN_REDIRECT = "/login?redirect=" + encodeURIComponent("/school-admin");

export default async function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
  if (!isDatabaseConfigured()) {
    await requireUser(LOGIN_REDIRECT);
    return (
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Database not configured</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              This app needs <code className="text-xs text-foreground">DATABASE_URL</code> in{" "}
              <code className="text-xs text-foreground">.env.local</code> (or your host&apos;s environment). Use
              the Supabase Postgres connection string, usually the{" "}
              <strong>Transaction pooler</strong> (port 6543) with user{" "}
              <code className="text-xs">postgres.</code>…, not the literal user <code className="text-xs">postgres</code>{" "}
              on 6543.
            </p>
            <p>
              After you add it, restart the dev server. On Vercel, add the variable under Project → Settings →
              Environment Variables.{" "}
              <Link className="text-primary underline" href="/">
                Back to home
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  await requireRole(["SCHOOL_ADMIN"]);
  return <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">{children}</div>;
}
