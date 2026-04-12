import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureContributorProfile } from "@/lib/auth/ensure-profile";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

function safeRedirectPath(path: string, fallback = "/"): string {
  const p = (path || fallback).trim();
  if (!p.startsWith("/") || p.startsWith("//")) return fallback;
  return p;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next") ?? "/");

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await ensureContributorProfile(user);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
