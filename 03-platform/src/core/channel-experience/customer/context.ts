/**
 * Purpose:
 * ENG-003o — Compose Customer Web request context for storefront routes.
 */

import {
  createCustomerWebSessionPayload,
  getCustomerWebSessionFromCookie,
  setCustomerWebSessionCookie,
} from "@/core/channel-experience/customer/guest-session";
import { resolveCustomerWebIdentity } from "@/core/channel-experience/customer/identity";
import {
  assertSessionMatchesTenant,
  resolveCustomerTenantByBusinessCode,
} from "@/core/channel-experience/customer/tenant-resolution";
import type { CustomerGatewayPreResolved } from "@/core/channel-experience/customer/gateway";
import { toCustomerSafeBusinessSummary } from "@/core/channel-experience/customer/dto";
import type { CustomerSafeBusinessSummary } from "@/core/channel-experience/customer/types";

export type CustomerWebStoreContext = CustomerGatewayPreResolved & {
  store: CustomerSafeBusinessSummary;
};

/**
 * WHAT: Resolve tenant from URL, ensure guest session, build customer identity.
 * WHY: Foundation for all Customer Web capability invocations.
 *
 * Note: Establishing/rotating the cookie requires a Server Action or Route Handler
 * when cookies().set is needed. Pages may call ensure with writeSession=false
 * and use a bootstrap action for first visit.
 */
export async function resolveCustomerWebStoreContext(
  businessCode: string,
  options?: { writeSession?: boolean }
): Promise<CustomerWebStoreContext> {
  const customerTenant =
    await resolveCustomerTenantByBusinessCode(businessCode);

  let session = await getCustomerWebSessionFromCookie();

  if (!session) {
    session = createCustomerWebSessionPayload({
      businessId: customerTenant.businessId,
      businessCode: customerTenant.businessCode,
    });
    if (options?.writeSession !== false) {
      try {
        await setCustomerWebSessionCookie(session);
      } catch {
        // Page/render path may forbid cookie writes — caller must bootstrap via action.
      }
    }
  } else {
    assertSessionMatchesTenant(
      session.businessId,
      session.businessCode,
      customerTenant
    );
  }

  const resolved = await resolveCustomerWebIdentity(session, customerTenant);

  return {
    identity: resolved.identity,
    customerTenant,
    session,
    store: toCustomerSafeBusinessSummary(customerTenant),
  };
}
