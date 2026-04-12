import Link from "next/link";
import { redirect } from "next/navigation";
import { LinkButton } from "@/components/link-button";
import { getSessionUser } from "@/lib/auth";
import { isDatabaseConfigured } from "@/lib/db-safe";

export default async function VerifiedPage() {
  const user = isDatabaseConfigured() ? await getSessionUser() : null;
  if (!user) {
    redirect("/login?redirect=%2Fverified&reason=auth");
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Account active</h1>
        <p className="text-sm text-muted-foreground">
          Your email is verified. You are signed in and your contributor account is ready to use.
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <LinkButton href="/my-submissions" className="w-full sm:flex-1">
          My submissions
        </LinkButton>
        <LinkButton href="/" variant="outline" className="w-full sm:flex-1">
          Home
        </LinkButton>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        <Link href="/account" className="text-primary hover:underline">
          Account settings
        </Link>
      </p>
    </div>
  );
}
