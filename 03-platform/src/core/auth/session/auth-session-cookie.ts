/**
 * Purpose:
 * Encode, sign, and manage the platform authentication session cookie.
 *
 * Design rationale:
 * Stage 1 sessions are secure HttpOnly cookies signed with HMAC-SHA256.
 * PostgreSQL remains the identity source of truth; the cookie only transports
 * the authenticated platformUserId for the request lifecycle.
 *
 * Why this exists:
 * Replaces Supabase Auth JWT cookies as the primary session mechanism.
 *
 * Architecture note:
 * This intentionally diverges from AD-009 ADR-009 (Supabase Auth as Phase 1
 * provider) per BP-001 Foundation Stabilization Stage 1 roadmap alignment.
 */

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import {
  AUTH_COOKIE_OPTIONS,
  AUTH_SESSION_COOKIE,
} from "@/core/auth/constants";

export type AuthSessionPayload = {
  platformUserId: string;
  issuedAt: number;
};

function getSigningSecret(): string {
  const secret =
    process.env.AUTH_SESSION_SECRET ??
    process.env.BUSINESS_CONTEXT_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!secret) {
    throw new Error("Auth session signing secret is not configured.");
  }

  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");
}

function encodeSession(session: AuthSessionPayload): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url"
  );
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function decodeSession(rawValue: string): AuthSessionPayload | null {
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
    ) as AuthSessionPayload;

    if (!parsed.platformUserId || typeof parsed.issuedAt !== "number") {
      return null;
    }

    const ageMs = Date.now() - parsed.issuedAt;
    const maxAgeMs = AUTH_COOKIE_OPTIONS.maxAge * 1000;

    if (ageMs < 0 || ageMs > maxAgeMs) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

/**
 * WHAT: Read and verify the authenticated platform session from the cookie.
 * WHY: Server routes must resolve identity without calling Supabase Auth.
 */
export async function getAuthSessionFromCookie(): Promise<AuthSessionPayload | null> {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(AUTH_SESSION_COOKIE)?.value;

  if (!rawValue) {
    return null;
  }

  return decodeSession(rawValue);
}

/**
 * WHAT: Establish a signed HttpOnly auth session cookie.
 * WHY: Successful login/registration must create a platform session transport.
 *
 * CONSTRAINT:
 * Call only from a Server Action or Route Handler. Next.js forbids
 * cookies().set during page/layout Server Component rendering.
 */
export async function setAuthSessionCookie(
  platformUserId: string
): Promise<void> {
  const cookieStore = await cookies();
  const session: AuthSessionPayload = {
    platformUserId,
    issuedAt: Date.now(),
  };

  cookieStore.set(
    AUTH_SESSION_COOKIE,
    encodeSession(session),
    AUTH_COOKIE_OPTIONS
  );
}

/**
 * WHAT: Clear the platform auth session cookie.
 * WHY: Logout must terminate the authenticated session transport.
 *
 * CONSTRAINT:
 * Call only from a Server Action or Route Handler (e.g. logoutAction).
 */
export async function clearAuthSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_SESSION_COOKIE);
}

/**
 * WHAT: Verify a raw cookie value (for request-scoped helpers).
 * WHY: Allows non-async callers that already hold the cookie string.
 */
export function parseAuthSessionFromRaw(
  rawValue: string | undefined
): AuthSessionPayload | null {
  if (!rawValue) {
    return null;
  }

  return decodeSession(rawValue);
}
