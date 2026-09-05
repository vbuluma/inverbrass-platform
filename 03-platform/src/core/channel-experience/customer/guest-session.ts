/**
 * Purpose:
 * ENG-003o — Secure Customer Web guest session cookie (SL-ENG-003o-002).
 *
 * Opaque server-generated session id; HMAC-signed transport; HttpOnly.
 * Never stores PII or staff tokens. Path-scoped to /store.
 */

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

import {
  CUSTOMER_WEB_COOKIE_OPTIONS,
  CUSTOMER_WEB_SESSION_COOKIE,
} from "@/core/channel-experience/customer/constants";
import type {
  CustomerCartState,
  CustomerWebSessionPayload,
} from "@/core/channel-experience/customer/types";

function getSigningSecret(): string {
  const secret =
    process.env.CUSTOMER_WEB_SESSION_SECRET ??
    process.env.AUTH_SESSION_SECRET ??
    process.env.BUSINESS_CONTEXT_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!secret) {
    throw new Error("Customer Web session signing secret is not configured.");
  }

  return secret;
}

function signPayload(payload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(payload)
    .digest("base64url");
}

export function encodeCustomerWebSession(
  session: CustomerWebSessionPayload
): string {
  const payload = Buffer.from(JSON.stringify(session), "utf8").toString(
    "base64url"
  );
  return `${payload}.${signPayload(payload)}`;
}

export function decodeCustomerWebSession(
  rawValue: string
): CustomerWebSessionPayload | null {
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
    ) as CustomerWebSessionPayload;

    if (
      !parsed.sessionId ||
      !parsed.businessId ||
      !parsed.businessCode ||
      typeof parsed.issuedAt !== "number"
    ) {
      return null;
    }

    const ageMs = Date.now() - parsed.issuedAt;
    const maxAgeMs = CUSTOMER_WEB_COOKIE_OPTIONS.maxAge * 1000;
    if (ageMs < 0 || ageMs > maxAgeMs) {
      return null;
    }

    return {
      sessionId: parsed.sessionId,
      businessId: parsed.businessId,
      businessCode: parsed.businessCode,
      issuedAt: parsed.issuedAt,
      rotatedFrom: parsed.rotatedFrom ?? null,
      partyId: parsed.partyId ?? null,
      cart: parsed.cart ?? null,
    };
  } catch {
    return null;
  }
}

export function createCustomerWebSessionPayload(input: {
  businessId: string;
  businessCode: string;
  partyId?: string | null;
  cart?: CustomerCartState | null;
  rotatedFrom?: string | null;
  /** Optional — tests may reuse an existing opaque session id. */
  sessionId?: string;
}): CustomerWebSessionPayload {
  return {
    sessionId: input.sessionId ?? randomUUID(),
    businessId: input.businessId,
    businessCode: input.businessCode.toUpperCase(),
    issuedAt: Date.now(),
    rotatedFrom: input.rotatedFrom ?? null,
    partyId: input.partyId ?? null,
    cart: input.cart ?? null,
  };
}

/**
 * WHAT: Read and verify Customer Web guest/customer session.
 * WHY: Storefront identity must not use staff business-context cookies.
 */
export async function getCustomerWebSessionFromCookie(): Promise<CustomerWebSessionPayload | null> {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(CUSTOMER_WEB_SESSION_COOKIE)?.value;
  if (!rawValue) {
    return null;
  }
  return decodeCustomerWebSession(rawValue);
}

/**
 * CONSTRAINT: Call only from Server Action or Route Handler (cookies().set).
 */
export async function setCustomerWebSessionCookie(
  session: CustomerWebSessionPayload
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(
    CUSTOMER_WEB_SESSION_COOKIE,
    encodeCustomerWebSession(session),
    CUSTOMER_WEB_COOKIE_OPTIONS
  );
}

/**
 * WHAT: Rotate session id (fixation protection) while preserving cart/party binding.
 */
export async function rotateCustomerWebSession(
  current: CustomerWebSessionPayload
): Promise<CustomerWebSessionPayload> {
  const next = createCustomerWebSessionPayload({
    businessId: current.businessId,
    businessCode: current.businessCode,
    partyId: current.partyId,
    cart: current.cart,
    rotatedFrom: current.sessionId,
  });
  await setCustomerWebSessionCookie(next);
  return next;
}

export async function clearCustomerWebSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CUSTOMER_WEB_SESSION_COOKIE, "", {
    ...CUSTOMER_WEB_COOKIE_OPTIONS,
    maxAge: 0,
  });
}

export function isOpaqueSessionId(sessionId: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    sessionId
  );
}
