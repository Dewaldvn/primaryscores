import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="text-sm text-muted-foreground">
          We email you a verification link. Opening it confirms your address, signs you in, and activates your
          account. Use the same password here when signing in later.
        </p>
        <p className="text-xs text-muted-foreground">
          Project setup: enable <span className="font-medium">Confirm email</span> in Supabase (Authentication →
          Email) and allow redirect{" "}
          <code className="rounded bg-muted px-1 py-0.5">…/auth/callback</code>.
        </p>
      </div>
      <AuthForm mode="signup" redirectTo="/verified" />
      <p className="text-center text-sm text-muted-foreground">
        Already registered?{" "}
        <Link href="/login" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
