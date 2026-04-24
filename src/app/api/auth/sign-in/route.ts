import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ensureProfileAndGetOnboardingStatus } from "@/lib/auth/ensure-profile";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

function safeRedirectPath(path: string, fallback = "/"): string {
  const p = (path || fallback).trim();
  if (!p.startsWith("/") || p.startsWith("//")) return fallback;
  return p;
}

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("email not confirmed") || m.includes("not confirmed")) {
    return "Confirm your email first, or disable “Confirm email” under Supabase → Authentication → Providers → Email for local dev.";
  }
  if (m.includes("invalid login credentials") || m.includes("invalid credentials")) {
    return "Wrong email or password.";
  }
  return message;
}

type Body = { email?: string; password?: string; redirect?: string };

/**
 * Password sign-in with session cookies on this response body.
 * Next.js Server Actions often fail to persist Supabase cookies; a Route Handler + fetch does not.
 */
export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const email = String(body.email ?? "").trim();
  const password = String(body.password ?? "");
  const redirectTo = safeRedirectPath(String(body.redirect ?? "/"));

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "Email and password are required." }, { status: 400 });
  }

  // Collect Set-Cookie from the client, then attach in one `NextResponse` (includes PENDING case).
  let supabaseSetCookies: { name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }[] =
    [];

  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        supabaseSetCookies = cookiesToSet;
      },
    },
  });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return NextResponse.json({ ok: false, error: friendlyError(error.message) }, { status: 401 });
  }

  let outRedirect = redirectTo;
  const user = data.user;
  if (user) {
    const ob = await ensureProfileAndGetOnboardingStatus(user);
    if (ob === "PENDING") outRedirect = "/account";
  }

  const res = NextResponse.json({ ok: true as const, redirectTo: outRedirect });
  for (const c of supabaseSetCookies) {
    res.cookies.set(c.name, c.value, c.options);
  }
  return res;
}
