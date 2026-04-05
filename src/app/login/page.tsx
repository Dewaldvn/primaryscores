import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

type Props = { searchParams: { redirect?: string; reason?: string } };

export default function LoginPage({ searchParams }: Props) {
  const redirect = searchParams.redirect ?? "/";
  const showSignInRequired = searchParams.reason === "auth";

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use the email and password you registered with.
        </p>
        {showSignInRequired ? (
          <p className="mt-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
            Sign in to continue. After signing in, confirm your email if your Supabase project requires it
            (check the inbox you used at signup).
          </p>
        ) : null}
        <p className="mt-3 text-xs text-muted-foreground">
          If sign-in fails with “confirm your email”, open Supabase → Authentication → Providers → Email
          and turn off <strong className="font-medium">Confirm email</strong> for local testing, or click the
          link in your confirmation email.
        </p>
      </div>
      <AuthForm mode="login" redirectTo={redirect} />
      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
