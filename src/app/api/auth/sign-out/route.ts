import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

export const dynamic = "force-dynamic";

/**
 * Clears Supabase auth cookies on the response. Client-only signOut() does not reliably
 * clear httpOnly cookies set via the server sign-in flow — same reason as POST /api/auth/sign-in.
 */
export async function POST(request: NextRequest) {
  const res = NextResponse.json({ ok: true as const });

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
  return res;
}
