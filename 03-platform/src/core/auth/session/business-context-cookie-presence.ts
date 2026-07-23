/**
 * Purpose:
 * Detect business context cookie presence for Edge middleware route protection.
 *
 * Business Context:
 * Middleware runs on the Edge runtime and cannot use Node.js crypto APIs. It only
 * needs to know whether a business context transport cookie exists before allowing
 * access to business module routes.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (ADR-012)
 *
 * Implementation Package:
 * IP-004 – Runtime Architecture Fix
 *
 * Responsibilities:
 * - Presence-only detection of the business context cookie
 *
 * Non-Responsibilities:
 * - Cookie signature verification (BusinessContextService)
 * - Membership validation (BusinessContextService)
 * - Cookie encoding or decoding
 *
 * Dependencies:
 * - BUSINESS_CONTEXT_COOKIE constant
 *
 * Business Rules Implemented:
 * - ADR-012 — business modules require an active business context selection
 *
 * Extension Points:
 * - Additional transport cookies may expose parallel presence helpers when required
 */

import type { NextRequest } from "next/server";

import { BUSINESS_CONTEXT_COOKIE } from "@/core/auth/constants";

/**
 * Purpose:
 * Determine whether the business context transport cookie is present on the request.
 *
 * Business Context:
 * Middleware uses this to redirect users without any business selection to
 * `/select-business` without performing cryptographic validation at the edge.
 *
 * Inputs:
 * - request — incoming Next.js middleware request
 *
 * Outputs:
 * - true when the cookie exists with a non-empty value; otherwise false
 */
export function hasBusinessContextCookie(request: NextRequest): boolean {
  const value = request.cookies.get(BUSINESS_CONTEXT_COOKIE)?.value;

  return typeof value === "string" && value.length > 0;
}
