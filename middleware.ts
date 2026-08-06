import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Public routes that MUST bypass authentication completely
const PUBLIC_PATHS = new Set([
  "/",
  "/privacy",
  "/login",
  "/signup",
  "/forgot",
  "/manifest.webmanifest",
  "/manifest.json",
  "/sw.js",
  "/spadas-ai.apk",
  "/offline.html",
]);

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const cleanPath = pathname.replace(/\/$/, "") || "/";

  // 1. ABSOLUTE BYPASS FOR PUBLIC ROUTES & STATIC ASSETS (Zero Supabase Auth Overhead)
  if (
    PUBLIC_PATHS.has(cleanPath) ||
    cleanPath.startsWith("/privacy") ||
    cleanPath.endsWith(".apk") ||
    cleanPath.endsWith(".json") ||
    cleanPath.endsWith(".webmanifest") ||
    cleanPath.endsWith(".png") ||
    cleanPath.endsWith(".svg") ||
    cleanPath.endsWith(".html")
  ) {
    return NextResponse.next();
  }

  // 2. PROTECTED ROUTES (Dashboard, Analytics, Sourcing, Generator, etc.)
  let response = NextResponse.next({
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
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not authenticated, redirect to /login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon\\.ico|privacy|login|signup|spadas-ai\\.apk|manifest\\.webmanifest|manifest\\.json|sw\\.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|apk|webmanifest|json)$).*)",
  ],
};