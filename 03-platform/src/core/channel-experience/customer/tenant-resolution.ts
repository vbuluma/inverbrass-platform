/**
 * Purpose:
 * ENG-003o — Resolve Customer Web tenant from /store/[businessCode] (D-02).
 *
 * businessCode is a discovery key, not authorization proof.
 * Staff business-context cookies must never override this resolution.
 */

import { and, eq } from "drizzle-orm";

import { BUSINESS_STATUS } from "@/core/auth/constants";
import {
  CHANNEL_EXPERIENCE_ERROR_CODES,
  ChannelExperienceError,
} from "@/core/channel-experience/errors";
import type { CustomerTenantContext } from "@/core/channel-experience/customer/types";
import { getDb } from "@/db/client";
import { business } from "@/db/schema/business";

const BUSINESS_CODE_PATTERN = /^[A-Z0-9-]{3,20}$/;

export function normalizeBusinessCode(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidBusinessCodeFormat(code: string): boolean {
  return BUSINESS_CODE_PATTERN.test(normalizeBusinessCode(code));
}

export async function resolveCustomerTenantByBusinessCode(
  businessCodeRaw: string
): Promise<CustomerTenantContext> {
  const businessCode = normalizeBusinessCode(businessCodeRaw);

  if (!isValidBusinessCodeFormat(businessCode)) {
    throw new ChannelExperienceError(
      CHANNEL_EXPERIENCE_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
      "Store not found.",
      404
    );
  }

  const db = getDb();
  const [row] = await db
    .select({
      id: business.id,
      code: business.code,
      name: business.name,
      statusCode: business.statusCode,
    })
    .from(business)
    .where(
      and(
        eq(business.code, businessCode),
        eq(business.statusCode, BUSINESS_STATUS.ACTIVE)
      )
    )
    .limit(1);

  if (!row) {
    throw new ChannelExperienceError(
      CHANNEL_EXPERIENCE_ERROR_CODES.BUSINESS_CONTEXT_REQUIRED,
      "Store not found.",
      404
    );
  }

  return {
    businessId: row.id,
    businessCode: row.code,
    businessName: row.name,
    statusCode: row.statusCode,
  };
}

/**
 * WHAT: Bind an existing guest session to the URL-resolved tenant.
 * WHY: URL manipulation must not silently switch tenants mid-session.
 */
export function assertSessionMatchesTenant(
  sessionBusinessId: string,
  sessionBusinessCode: string,
  tenant: CustomerTenantContext
): void {
  if (
    sessionBusinessId !== tenant.businessId ||
    normalizeBusinessCode(sessionBusinessCode) !==
      normalizeBusinessCode(tenant.businessCode)
  ) {
    throw new ChannelExperienceError(
      CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_DENIED,
      "Customer session does not match this store.",
      403
    );
  }
}
