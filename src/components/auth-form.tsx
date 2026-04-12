"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { signupDisplayNameSchema } from "@/lib/validators/auth";

/** Only allow same-origin relative paths (avoids open redirects). */
function safeRedirectPath(path: string, fallback = "/"): string {
  const p = path.trim() || fallback;
  if (!p.startsWith("/") || p.startsWith("//")) return fallback;
  return p;
}

export function AuthForm({
  mode,
  redirectTo,
}: {
  mode: "login" | "signup";
  redirectTo: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim();
    const password = String(fd.get("password") ?? "");

    try {
      if (mode === "signup") {
        const nameRaw = String(fd.get("name") ?? "");
        const parsedName = signupDisplayNameSchema.safeParse(nameRaw);
        if (!parsedName.success) {
          const msg = parsedName.error.flatten().formErrors[0] ?? "Check your name.";
          toast.error(msg);
          return;
        }
        const displayName = parsedName.data;
        const supabase = createClient();
        const site = process.env.NEXT_PUBLIC_SITE_URL?.trim() || window.location.origin;
        const afterVerify = safeRedirectPath(redirectTo);
        const emailRedirectTo = `${site}/auth/callback?next=${encodeURIComponent(afterVerify)}`;

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo,
            data: { full_name: displayName },
          },
        });
        if (error) throw error;
        toast.success(
          "Check your email for a verification link. After you confirm, your account is active and you can sign in."
        );
        router.push("/login");
      } else {
        const next = safeRedirectPath(redirectTo);
        const res = await fetch("/api/auth/sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ email, password, redirect: next }),
        });
        const data = (await res.json()) as { ok?: boolean; error?: string; redirectTo?: string };
        if (!res.ok || !data.ok) {
          toast.error(data.error ?? "Sign in failed");
          return;
        }
        window.location.assign(data.redirectTo ?? next);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-6">
      {mode === "signup" ? (
        <div className="space-y-1.5">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="How you want to appear on submissions"
            minLength={2}
            maxLength={80}
            required
          />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          minLength={6}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Sign up"}
      </Button>
    </form>
  );
}
