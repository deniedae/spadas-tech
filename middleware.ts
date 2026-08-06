import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Routes that do NOT require authentication
const PUBLIC_ROUTES = [
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
];

function isPublicRoute(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_ROUTES.some(
    (route) => route !== "/" && (pathname === route || pathname.startsWith(`${route}/`))
  );
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Immediate bypass for all public pages, assets, and static files
  if (
    isPublicRoute(pathname) ||
    pathname.endsWith(".webmanifest") ||
    pathname.endsWith(".json") ||
    pathname.endsWith(".apk") ||
    pathname.endsWith(".html") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".svg")
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

  // Not logged in → protect private pages
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
    "/((?!api|_next/static|_next/image|favicon.ico|privacy|manifest\\.webmanifest|manifest\\.json|sw\\.js|spadas-ai\\.apk|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|apk|webmanifest|json)$).*)",
  ],
};