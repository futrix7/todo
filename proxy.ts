import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const canonicalHost = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://taskflow.app"
)
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");

const PUBLIC_ROUTES = new Set([
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/auth/confirm",
  "/auth/confirm/error",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/llms.txt",
  "/llms-full.txt",
  "/opengraph-image",
  "/twitter-image",
]);

function redirectTo(request: NextRequest, pathname: string) {
  const response = NextResponse.redirect(new URL(pathname, request.url));
  return response;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const host = request.headers.get("host") ?? "";
  const wantsWww = canonicalHost.startsWith("www.");
  const preferredHost = wantsWww ? canonicalHost : canonicalHost.replace(/^www\./, "");

  if (wantsWww && !host.startsWith("www.")) {
    const url = new URL(request.url);
    url.host = canonicalHost;
    return NextResponse.redirect(url, 308);
  }

  if (!wantsWww && host.startsWith("www.")) {
    const url = new URL(request.url);
    url.host = preferredHost;
    return NextResponse.redirect(url, 308);
  }

  if (pathname.length > 1 && pathname.endsWith("/")) {
    const url = new URL(request.url);
    url.pathname = pathname.replace(/\/+$/, "") || "/";
    return NextResponse.redirect(url, 308);
  }

  const isPublicRoute = PUBLIC_ROUTES.has(pathname);
  const isHome = pathname === "/";

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isPublicRoute || isHome) return NextResponse.next();
    return redirectTo(request, "/login");
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const { data, error } = await supabase.auth.getClaims();
  let authenticated = false;
  if (!error && data) {
    authenticated = Boolean(data.claims?.sub);
  }

  if (!authenticated && !isPublicRoute && !isHome) {
    const redirectResponse = redirectTo(request, "/login");
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  if (
    authenticated &&
    ((isPublicRoute && pathname !== "/reset-password") || isHome)
  ) {
    const redirectResponse = redirectTo(request, "/tasks");
    response.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie);
    });
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|manifest.webmanifest|llms.txt|llms-full.txt|opengraph-image|twitter-image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
