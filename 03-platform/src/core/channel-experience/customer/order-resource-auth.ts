/**
 * Purpose:
 * SL-CUS-001 — Order/payment/receipt resource authorization via order metadata.
 */

import {
  CHANNEL_EXPERIENCE_ERROR_CODES,
  ChannelExperienceError,
} from "@/core/channel-experience/errors";
import type { CustomerResourceScope } from "@/core/channel-experience/customer/types";
import { assertCustomerResourceAccess } from "@/core/channel-experience/customer/resource-scope";

export type CustomerWebOrderMetadata = {
  customerWeb?: {
    guestSessionId?: string;
    partyId?: string;
    correlationId?: string;
    channelSource?: string;
  };
};

export function extractCustomerWebScopeFromOrderMetadata(
  businessId: string,
  metadata: Record<string, unknown> | null | undefined
): {
  guestSessionId: string | null;
  partyId: string | null;
} {
  const customerWeb = (metadata as CustomerWebOrderMetadata | null)?.customerWeb;
  return {
    guestSessionId: customerWeb?.guestSessionId ?? null,
    partyId: customerWeb?.partyId ?? null,
  };
}

export function assertCustomerOrderAccess(
  scope: CustomerResourceScope,
  order: {
    businessId: string;
    metadata: Record<string, unknown> | null | undefined;
    partyId: string;
  }
): void {
  if (order.businessId !== scope.businessId) {
    throw new ChannelExperienceError(
      CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_DENIED,
      "This purchase is not available.",
      403
    );
  }

  const extracted = extractCustomerWebScopeFromOrderMetadata(
    order.businessId,
    order.metadata
  );

  assertCustomerResourceAccess(scope, {
    businessId: order.businessId,
    guestSessionId: extracted.guestSessionId,
    partyId: extracted.partyId ?? order.partyId,
  });
}

export function buildCustomerWebOrderMetadata(input: {
  guestSessionId: string;
  partyId: string;
  correlationId: string;
}): CustomerWebOrderMetadata {
  return {
    customerWeb: {
      guestSessionId: input.guestSessionId,
      partyId: input.partyId,
      correlationId: input.correlationId,
      channelSource: "CUSTOMER_WEB",
    },
  };
}
