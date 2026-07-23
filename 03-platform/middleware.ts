/**
 * Purpose:
 * Protect routes at the edge using session and signed business context cookies only.
 *
 * Business Context:
 * Middleware runs on the Edge runtime and cannot query PostgreSQL. Authentication state
 * comes from Supabase Auth; business context comes from the signed cookie written by
 * BusinessContextService. First-login enforcement is delegated to authenticated route guards.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding
 *
 * Implementation Package:
 * IP-001 (foundation), IP-004 (first-login route grouping)
 *
 * Responsibilities:
 * - Supabase session refresh
 * - Unauthenticated redirect to login
 * - Authenticated redirect away from public auth pages
 * - Business context cookie presence checks
 *
 * Non-Responsibilities:
 * - mustChangePassword evaluation (AuthService via route guards)
 * - Password policy or security question rules
 * - Business membership validation beyond cookie presence
 *
 * Dependencies:
 * - @supabase/ssr
 * - business-context-cookie parser
 *
 * Business Rules Implemented:
 * - AD-009 §3.5 — protected routes require authentication
 * - ADR-012 — business modules require current business context cookie
 *
 * Extension Points:
 * - Additional public or context-exempt routes may be registered in constants
 */

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { parseBusinessContextFromRequest } from "@/core/auth/session/business-context-cookie";

const PUBLIC_PATHS = ["/", "/login", "/register", "/recover-password"];
const AUTHENTICATED_WITHOUT_BUSINESS_CONTEXT = ["/select-business", "/first-login"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

function requiresBusinessContext(pathname: string): boolean {
  if (isPublicPath(pathname)) {
    return false;
  }

  return !AUTHENTICATED_WITHOUT_BUSINESS_CONTEXT.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function middleware(request: NextRequest) {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && (pathname === "/login" || pathname === "/register")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/dashboard";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (user && requiresBusinessContext(pathname)) {
    const businessContext = parseBusinessContextFromRequest(request);

    if (!businessContext) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/select-business";
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
