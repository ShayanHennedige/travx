import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  const pathname = request.nextUrl.pathname;

  // List of public paths that don't require authentication
  const publicPaths = [
    "/inquiry",
    "/api/inquiry",
    "/feedback",
    "/api/feedback",
    "/hotel-rates",
    "/api/hotel-rates",
    "/login",
    "/auth",
    "/api/debug-emails",
    "/api/debug/backfill-references",
  ];

  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + "/")
  );

  // Refreshing the auth token and get session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const user = session?.user || null;

  // If it's a public path, just proceed (but we still refreshed the session above if cookies were present)
  if (isPublicPath) {
    // If user is already logged in and tries to access login, redirect to dashboard
    if (user && pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return supabaseResponse;
  }

  // If there's no user and we're not on a public page, redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Check session age - force logout if session is too old
  if (session) {
    const sessionExpiresAt = session.expires_at ? session.expires_at * 1000 : 0;
    const now = Date.now();

    if (sessionExpiresAt > 0 && now >= sessionExpiresAt) {
      // Session expired - sign out and redirect to login
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("reason", "session_expired");

      const response = NextResponse.redirect(url);
      // Clear all auth cookies
      response.cookies.delete('sb-access-token');
      response.cookies.delete('sb-refresh-token');
      return response;
    }
  }

  return supabaseResponse;
}
