/**
 * Purpose:
 * Transport the current business context between requests via a signed httpOnly cookie.
 *
 * Business Context:
 * The platform stores the selected business membership in a cookie so subsequent server
 * requests can resolve current business context without re-querying membership on every
 * navigation. Signature verification is performed in the service layer, not middleware.
 *
 * Architecture Dependency:
 * AD-009 Authentication & Business Onboarding (ADR-012)
 *
 * Implementation Package:
 * IP-001 (transport), IP-004 (runtime architecture fix)
 *
 * Responsibilities:
 * - Encode and write signed business context payloads
 * - Read raw cookie values for service-layer validation
 * - Clear the transport cookie on logout or tamper detection
 *
 * Non-Responsibilities:
 * - Route protection (middleware — presence only)
 * - Membership validation (BusinessContextService)
 * - Business rule enforcement
 *
 * Dependencies:
 * - Node.js crypto (server runtime only — must not be imported by middleware)
 * - Next.js cookies API
 *
 * Business Rules Implemented:
 * - ADR-012 — signed transport prevents casual tampering; validation occurs in services
 *
 * Extension Points:
 * - Payload shape follows CurrentBusinessContext and may gain metadata in future IPs
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import {
  AUTH_COOKIE_OPTIONS,
  BUSINESS_CONTEXT_COOKIE,
} from "@/core/auth/constants";
import type { CurrentBusinessContext } from "@/core/auth/types";

function getSigningSecret(): string {
  const secret =
    process.env.BUSINESS_CONTEXT_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!secret) {
    throw new Error("Business context signing secret is not configured.");
  }

  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");
}

function encodeContext(context: CurrentBusinessContext): string {
  const payload = Buffer.from(JSON.stringify(context), "utf8").toString(
    "base64url"
  );
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

/**
 * Purpose:
 * Decode and verify a signed business context transport payload.
 *
 * Business Context:
 * BusinessContextService relies on this to detect tampering before trusting the cookie.
 *
 * Inputs:
 * - rawValue — cookie value written by setBusinessContextCookie
 *
 * Outputs:
 * - Parsed CurrentBusinessContext when signature and shape are valid; otherwise null
 */
function decodeSignedBusinessContext(
  rawValue: string
): CurrentBusinessContext | null {
  const [payload, signature] = rawValue.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payload);

  const providedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as CurrentBusinessContext;

    if (
      !parsed.platformUserId ||
      !parsed.businessId ||
      !parsed.businessMembershipId
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * Purpose:
 * Read and cryptographically validate the business context transport cookie.
 *
 * Business Context:
 * BusinessContextService uses this as the authoritative read path on the server runtime.
 */
export async function readValidatedBusinessContextFromCookie(): Promise<CurrentBusinessContext | null> {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(BUSINESS_CONTEXT_COOKIE)?.value;

  if (!rawValue) {
    return null;
  }

  return decodeSignedBusinessContext(rawValue);
}

export async function setBusinessContextCookie(
  context: CurrentBusinessContext
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    BUSINESS_CONTEXT_COOKIE,
    encodeContext(context),
    AUTH_COOKIE_OPTIONS
  );
}

export async function clearBusinessContextCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(BUSINESS_CONTEXT_COOKIE);
}

/**
 * Purpose:
 * Remove a tampered transport cookie so middleware presence checks stay aligned with
 * service-layer validation outcomes.
 */
export async function clearBusinessContextCookieIfInvalid(): Promise<void> {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(BUSINESS_CONTEXT_COOKIE)?.value;

  if (!rawValue) {
    return;
  }

  if (!decodeSignedBusinessContext(rawValue)) {
    cookieStore.delete(BUSINESS_CONTEXT_COOKIE);
  }
}
