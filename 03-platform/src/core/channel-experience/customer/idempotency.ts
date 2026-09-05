/**
 * Purpose:
 * ENG-003o — CREATE_SALE idempotency contract preparation (SL-ENG-003o-002).
 *
 * Reuses the platform pattern: business-scoped idempotency keys.
 * Does not invent a second framework. Sales domain acceptance is still required.
 */

import { randomUUID } from "node:crypto";

import { CUSTOMER_WEB_SALE_IDEMPOTENCY_NAMESPACE } from "@/core/channel-experience/customer/constants";
import { CUSTOMER_WEB_QUOTATION_IDEMPOTENCY_NAMESPACE } from "@/core/channel-experience/customer/constants";
import { CUSTOMER_WEB_PAYMENT_IDEMPOTENCY_NAMESPACE } from "@/core/channel-experience/customer/constants";

export type CustomerSaleIdempotencyContract = {
  namespace: typeof CUSTOMER_WEB_SALE_IDEMPOTENCY_NAMESPACE;
  /**
   * Opaque key the Customer Web must send with CREATE_SALE.
   * Format: customer-web:create-sale:{guestSessionId}:{clientKey}
   */
  key: string;
  guestSessionId: string;
  businessId: string;
};

/**
 * WHAT: Build a stable channel-side idempotency key for CREATE_SALE.
 * WHY: SL-CUS-001 must not double-create sales on retry.
 *
 * STATUS: Contract ready. BP-006 createDirectSale does not yet accept this key —
 * recorded as remaining blocker for SL-CUS-001 certification.
 */
export function buildCustomerSaleIdempotencyKey(input: {
  businessId: string;
  guestSessionId: string;
  clientKey?: string;
}): CustomerSaleIdempotencyContract {
  const clientKey = input.clientKey?.trim() || randomUUID();
  return {
    namespace: CUSTOMER_WEB_SALE_IDEMPOTENCY_NAMESPACE,
    key: `${CUSTOMER_WEB_SALE_IDEMPOTENCY_NAMESPACE}:${input.guestSessionId}:${clientKey}`,
    guestSessionId: input.guestSessionId,
    businessId: input.businessId,
  };
}

export const CREATE_SALE_IDEMPOTENCY_STATUS = {
  channelContract: "READY",
  domainIntegration: "READY",
  blocker: null,
} as const;

export type CustomerQuotationIdempotencyContract = {
  namespace: typeof CUSTOMER_WEB_QUOTATION_IDEMPOTENCY_NAMESPACE;
  key: string;
  guestSessionId: string;
  businessId: string;
};

export function buildCustomerQuotationIdempotencyKey(input: {
  businessId: string;
  guestSessionId: string;
  clientKey?: string;
}): CustomerQuotationIdempotencyContract {
  const clientKey = input.clientKey?.trim() || randomUUID();
  return {
    namespace: CUSTOMER_WEB_QUOTATION_IDEMPOTENCY_NAMESPACE,
    key: `${CUSTOMER_WEB_QUOTATION_IDEMPOTENCY_NAMESPACE}:${input.guestSessionId}:${clientKey}`,
    guestSessionId: input.guestSessionId,
    businessId: input.businessId,
  };
}

export const CREATE_QUOTATION_IDEMPOTENCY_STATUS = {
  channelContract: "READY",
  domainIntegration: "READY",
  blocker: null,
} as const;

export type CustomerPaymentIdempotencyContract = {
  namespace: typeof CUSTOMER_WEB_PAYMENT_IDEMPOTENCY_NAMESPACE;
  key: string;
  guestSessionId: string;
  businessId: string;
};

export function buildCustomerPaymentIdempotencyKey(input: {
  businessId: string;
  guestSessionId: string;
  clientKey?: string;
}): CustomerPaymentIdempotencyContract {
  const clientKey = input.clientKey?.trim() || randomUUID();
  return {
    namespace: CUSTOMER_WEB_PAYMENT_IDEMPOTENCY_NAMESPACE,
    key: `${CUSTOMER_WEB_PAYMENT_IDEMPOTENCY_NAMESPACE}:${input.guestSessionId}:${clientKey}`,
    guestSessionId: input.guestSessionId,
    businessId: input.businessId,
  };
}

export const INITIATE_PAYMENT_IDEMPOTENCY_STATUS = {
  channelContract: "READY",
  domainIntegration: "READY",
  blocker: null,
} as const;
