import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const path = request.nextUrl.pathname;

  const needsAuth =
    path.startsWith("/ops") ||
    path.startsWith("/onboarding") ||
    path.startsWith("/api/bookings/mine") ||
    path.startsWith("/api/operators/me") ||
    path.startsWith("/api/services");

  if (!needsAuth) return response;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { error: "Supabase Auth is not configured" },
        { status: 503 },
      );
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("error", "auth-not-configured");
    return NextResponse.redirect(login);
  }

  // Session already refreshed in updateSession; read user via cookie present
  // by creating a lightweight check through the refreshed response cookies.
  const { createServerClient } = await import("@supabase/ssr");
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // no-op — updateSession already handled writes
      },
    },
  });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    login.searchParams.set("next", path);
    return NextResponse.redirect(login);
  }

  return response;
}

export const config = {
  matcher: [
    "/ops/:path*",
    "/onboarding",
    "/onboarding/:path*",
    "/api/bookings/mine",
    "/api/operators/me",
    "/api/operators/me/:path*",
    "/api/services",
    "/api/services/:path*",
    "/login",
    "/signup",
  ],
};
