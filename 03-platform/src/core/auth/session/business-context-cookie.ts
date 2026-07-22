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

function decodeContext(rawValue: string): CurrentBusinessContext | null {
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

export async function getBusinessContextFromCookie(): Promise<CurrentBusinessContext | null> {
  const cookieStore = await cookies();
  const rawValue = cookieStore.get(BUSINESS_CONTEXT_COOKIE)?.value;

  if (!rawValue) {
    return null;
  }

  return decodeContext(rawValue);
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

export function parseBusinessContextFromRequest(
  request: Request
): CurrentBusinessContext | null {
  const cookieHeader = request.headers.get("cookie");

  if (!cookieHeader) {
    return null;
  }

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${BUSINESS_CONTEXT_COOKIE}=`));

  if (!match) {
    return null;
  }

  const rawValue = decodeURIComponent(match.slice(BUSINESS_CONTEXT_COOKIE.length + 1));
  return decodeContext(rawValue);
}
