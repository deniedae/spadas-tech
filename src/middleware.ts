import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Explicit public routes that unauthenticated users are allowed to access (includes Instant Guest Scanning & Camera HUD tools)
const PUBLIC_PATHS = [
  "/",
  "/lens",
  "/snap",
  "/studio",
  "/haul",
  "/history",
  "/calculator",
  "/generator",
  "/radar",
  "/velocity",
  "/listings",
  "/login",
  "/signup",
  "/auth",
  "/terms",
  "/privacy",
  "/press",
  "/creators",
  "/delete-account",
  "/spadas-ai.apk",
  "/favicon.ico",
  "/app-ads.txt",
  "/ads.txt",
];

export async function middleware(request: NextRequest) {
  const rawPath = request.nextUrl.pathname;
  const pathname = rawPath.replace(/\/+$/, "") || "/";

  // Allow next.js internal assets, static media files, and APIs (APIs perform their own auth & return JSON 401s)
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/") ||
    pathname.includes(".") // Static files like .png, .jpg, .svg, .ico, .apk
  ) {
    return NextResponse.next();
  }

  // Allow explicit public marketing, camera hub tools, and auth pages
  if (
    PUBLIC_PATHS.includes(pathname) ||
    PUBLIC_PATHS.some((p) => p !== "/" && pathname.startsWith(p))
  ) {
    return NextResponse.next();
  }

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

  // If user is not authenticated, redirect to /login with redirect target:
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
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
