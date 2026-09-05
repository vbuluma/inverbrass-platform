/**
 * Purpose:
 * SL-CUS-001 — Bridge Customer Web tenant identity to domain CurrentBusinessContext.
 *
 * Never uses staff business-context cookie or membership grants.
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import type {
  CustomerChannelIdentity,
  CustomerTenantContext,
} from "@/core/channel-experience/customer/types";

/** Synthetic platform actor for guest customer domain writes (audit only). */
export const CUSTOMER_WEB_DOMAIN_ACTOR_ID =
  "00000000-0000-4000-8000-c00000000001";

export const CUSTOMER_WEB_DOMAIN_MEMBERSHIP_ID =
  "00000000-0000-4000-8000-c00000000002";

export function buildCustomerDomainContext(
  tenant: CustomerTenantContext,
  identity: CustomerChannelIdentity
): CurrentBusinessContext {
  return {
    businessId: tenant.businessId,
    platformUserId:
      identity.platformUserId ?? CUSTOMER_WEB_DOMAIN_ACTOR_ID,
    businessMembershipId: CUSTOMER_WEB_DOMAIN_MEMBERSHIP_ID,
  };
}

export function assertDomainTenantMatches(
  domainContext: CurrentBusinessContext,
  tenant: CustomerTenantContext
): void {
  if (domainContext.businessId !== tenant.businessId) {
    throw new Error("Customer domain context tenant mismatch.");
  }
}
