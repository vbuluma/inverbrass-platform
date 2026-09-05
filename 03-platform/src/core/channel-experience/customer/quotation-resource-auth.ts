/**
 * Purpose:
 * SL-CUS-003 — Quotation resource authorization via quotation metadata.
 */

import {
  CHANNEL_EXPERIENCE_ERROR_CODES,
  ChannelExperienceError,
} from "@/core/channel-experience/errors";
import type { CustomerResourceScope } from "@/core/channel-experience/customer/types";
import { assertCustomerResourceAccess } from "@/core/channel-experience/customer/resource-scope";

export type CustomerWebQuotationMetadata = {
  customerWeb?: {
    guestSessionId?: string;
    partyId?: string;
    correlationId?: string;
    channelSource?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
  };
};

export function extractCustomerWebScopeFromQuotationMetadata(
  metadata: Record<string, unknown> | null | undefined
): {
  guestSessionId: string | null;
  partyId: string | null;
} {
  const customerWeb = (metadata as CustomerWebQuotationMetadata | null)
    ?.customerWeb;
  return {
    guestSessionId: customerWeb?.guestSessionId ?? null,
    partyId: customerWeb?.partyId ?? null,
  };
}

export function assertCustomerQuotationAccess(
  scope: CustomerResourceScope,
  quotation: {
    businessId: string;
    metadata: Record<string, unknown> | null | undefined;
    partyId: string;
  }
): void {
  if (quotation.businessId !== scope.businessId) {
    throw new ChannelExperienceError(
      CHANNEL_EXPERIENCE_ERROR_CODES.CAPABILITY_DENIED,
      "This quotation is not available.",
      403
    );
  }

  const extracted = extractCustomerWebScopeFromQuotationMetadata(
    quotation.metadata
  );

  assertCustomerResourceAccess(scope, {
    businessId: quotation.businessId,
    guestSessionId: extracted.guestSessionId,
    partyId: extracted.partyId ?? quotation.partyId,
  });
}

export function buildCustomerWebQuotationMetadata(input: {
  guestSessionId: string;
  partyId: string;
  correlationId: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}): CustomerWebQuotationMetadata {
  return {
    customerWeb: {
      guestSessionId: input.guestSessionId,
      partyId: input.partyId,
      correlationId: input.correlationId,
      channelSource: "CUSTOMER_WEB",
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
    },
  };
}
