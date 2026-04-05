import Link from "next/link";
import { AuthForm } from "@/components/auth-form";

type Props = { searchParams: { redirect?: string; reason?: string } };

export default function LoginPage({ searchParams }: Props) {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Use the email and password you registered with.
        </p>
      </div>
      <AuthForm mode="login" redirectTo={searchParams.redirect ?? "/"} />
      <p className="text-center text-sm text-muted-foreground">
        No account?{" "}
        <Link href="/signup" className="text-primary hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
