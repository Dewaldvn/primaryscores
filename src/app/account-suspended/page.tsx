import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import { getProfile, requireUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function AccountSuspendedPage() {
  await requireUser("/login", { skipBanCheck: true });
  if (!isDatabaseConfigured()) {
    redirect("/");
  }
  const profile = await getProfile();
  if (!profile?.bannedAt) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-4 py-12">
      <Card>
        <CardHeader>
          <CardTitle>Account suspended</CardTitle>
          <CardDescription>
            This contributor account is blocked from using submissions, live scoring, and other signed-in features.
            If you think this is a mistake, contact support through your school or site administrators.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <p className="font-mono text-xs text-foreground">{profile.email}</p>
          <a
            href="/api/auth/sign-out?redirect=/"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }), "w-fit")}
          >
            Sign out
          </a>
          <Link href="/" className="text-primary underline">
            Back to home
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
