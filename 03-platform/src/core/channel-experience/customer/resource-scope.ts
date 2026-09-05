/**
 * Purpose:
 * ENG-003o — Guest/customer resource scoping foundation (SL-ENG-003o-002).
 *
 * Opaque IDs alone are never sufficient authorization.
 */

import {
  CHANNEL_EXPERIENCE_ERROR_CODES,
  ChannelExperienceError,
} from "@/core/channel-experience/errors";
import type { CustomerResourceScope } from "@/core/channel-experience/customer/types";

export type ScopedCustomerResource = {
  businessId: string;
  guestSessionId: string | null;
  partyId: string | null;
};

/**
 * WHAT: Authorize access to an order/payment/receipt-shaped resource.
 * WHY: Changing a resource id must never grant cross-customer or cross-tenant access.
 */
export function assertCustomerResourceAccess(
  scope: CustomerResourceScope,
  resource: ScopedCustomerResource
): void {
  if (resource.businessId !== scope.businessId) {
    throw new ChannelExperienceError(
      CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_DENIED,
      "Resource is not available in this store.",
      403
    );
  }

  if (scope.partyId && resource.partyId && scope.partyId === resource.partyId) {
    return;
  }

  if (
    resource.guestSessionId &&
    scope.guestSessionId &&
    resource.guestSessionId === scope.guestSessionId
  ) {
    return;
  }

  throw new ChannelExperienceError(
    CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_DENIED,
    "Resource is not available for this customer session.",
    403
  );
}

export function canAccessCustomerResource(
  scope: CustomerResourceScope,
  resource: ScopedCustomerResource
): boolean {
  try {
    assertCustomerResourceAccess(scope, resource);
    return true;
  } catch {
    return false;
  }
}
