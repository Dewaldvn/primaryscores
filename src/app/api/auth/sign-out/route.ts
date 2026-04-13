import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

async function clearAuthCookies(request: NextRequest, res: NextResponse) {
  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          res.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.signOut();
}

/**
 * Clears Supabase auth cookies on the response. Client-only signOut() does not reliably
 * clear httpOnly cookies set via the server sign-in flow — same reason as POST /api/auth/sign-in.
 */
export async function POST(request: NextRequest) {
  const res = NextResponse.json({ ok: true as const });
  await clearAuthCookies(request, res);
  return res;
}

/** Full-page sign-out with redirect; useful when UI should immediately reflect signed-out state. */
export async function GET(request: NextRequest) {
  const redirectTo = request.nextUrl.searchParams.get("redirect") || "/";
  const destination = new URL(redirectTo, request.url);
  const res = NextResponse.redirect(destination);
  await clearAuthCookies(request, res);
  return res;
}
