/**
 * Purpose:
 * Protect routes at the edge using platform auth session cookie presence.
 *
 * Design rationale (Stage 1):
 * Middleware no longer calls Supabase Auth. Authentication is presence of the
 * signed platform session cookie; cryptographic verification runs in AuthService
 * on the Node server runtime.
 *
 * Why this exists:
 * BP-001 Foundation Stabilization — platform-owned sessions via HttpOnly cookies.
 */

import { NextResponse, type NextRequest } from "next/server";

import { hasAuthSessionCookie } from "@/core/auth/session/auth-session-cookie-presence";
import { hasBusinessContextCookie } from "@/core/auth/session/business-context-cookie-presence";

const PUBLIC_PATHS = ["/", "/login", "/register", "/forgot-password"];

const AUTHENTICATED_WITHOUT_BUSINESS_CONTEXT = [
  "/home",
  "/profile",
  "/security",
  "/account",
  "/businesses/create",
  "/select-business",
  "/first-login",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

/** Legacy singular alias — canonical business route is `/parties`. */
function resolveLegacyPartyPath(pathname: string): string | null {
  if (pathname === "/party") {
    return "/parties";
  }

  if (pathname.startsWith("/party/")) {
    return `/parties${pathname.slice("/party".length)}`;
  }

  return null;
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
  const pathname = request.nextUrl.pathname;
  const legacyPartyPath = resolveLegacyPartyPath(pathname);

  if (legacyPartyPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = legacyPartyPath;
    return NextResponse.redirect(redirectUrl);
  }

  const hasSession = hasAuthSessionCookie(request);

  if (!hasSession && !isPublicPath(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (hasSession && (pathname === "/login" || pathname === "/register")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/home";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (hasSession && requiresBusinessContext(pathname)) {
    if (!hasBusinessContextCookie(request)) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/home";
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
