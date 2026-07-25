/**
 * Purpose:
 * Detect auth session cookie presence for Edge middleware (no crypto on Edge).
 *
 * Why this exists:
 * Middleware only needs presence; signature verification stays on the server runtime.
 */

import type { NextRequest } from "next/server";

import { AUTH_SESSION_COOKIE } from "@/core/auth/constants";

export function hasAuthSessionCookie(request: NextRequest): boolean {
  const value = request.cookies.get(AUTH_SESSION_COOKIE)?.value;
  return typeof value === "string" && value.length > 0;
}
