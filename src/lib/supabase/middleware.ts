import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/env";

function isSupabaseAuthCookieName(name: string): boolean {
  return /^(?:__Host-)?sb-.*-auth-token(?:\.\d+)?$/.test(name);
}

function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some((c) => isSupabaseAuthCookieName(c.name));
}

function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  const seen = new Set<string>();
  for (const cookie of request.cookies.getAll()) {
    if (!isSupabaseAuthCookieName(cookie.name)) continue;
    if (seen.has(cookie.name)) continue;
    seen.add(cookie.name);
    response.cookies.set(cookie.name, "", {
      maxAge: 0,
      expires: new Date(0),
      path: "/",
    });
  }
}

function isRefreshTokenNotFoundError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("refresh token not found") || msg.includes("refresh_token_not_found");
}

export async function updateSession(request: NextRequest) {
  try {
    // Anonymous users should not trigger refresh attempts.
    if (!hasSupabaseAuthCookies(request)) {
      return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({
      request,
    });

    const supabase = createServerClient(
      getSupabaseUrl(),
      getSupabasePublishableKey(),
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            supabaseResponse = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              supabaseResponse.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    await supabase.auth.getUser();

    return supabaseResponse;
  } catch (e) {
    if (isRefreshTokenNotFoundError(e)) {
      const res = NextResponse.next({ request });
      clearSupabaseAuthCookies(request, res);
      return res;
    }
    if (process.env.NODE_ENV === "development") {
      console.error("[supabase middleware] session refresh skipped:", e);
    }
    return NextResponse.next({ request });
  }
}
