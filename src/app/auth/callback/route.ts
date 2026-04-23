import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ensureContributorProfile } from "@/lib/auth/ensure-profile";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";

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
      let user = null;
      try {
        const {
          data: { user: fetched },
        } = await supabase.auth.getUser();
        user = fetched;
      } catch {
        user = null;
      }
      if (user) {
        await ensureContributorProfile(user);
        const [profile] = await db
          .select({ onboardingStatus: profiles.onboardingStatus })
          .from(profiles)
          .where(eq(profiles.id, user.id))
          .limit(1);
        if (profile?.onboardingStatus === "PENDING") {
          return NextResponse.redirect(`${origin}/account`);
        }
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
