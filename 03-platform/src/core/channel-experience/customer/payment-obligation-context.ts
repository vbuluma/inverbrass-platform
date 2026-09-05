/**
 * Purpose:
 * SL-CUS-005 — Resolve + authorize a customer payment obligation context.
 *
 * Application/read context only — not a persisted entity.
 * Every payment initiation must re-resolve through this path.
 *
 * Authorization: tenant + Party/order resource scope (D-05-06).
 * Does not authorize solely by obligation/order ID possession.
 */

import {
  CUSTOMER_COMMERCE_ERROR_CODES,
  CustomerCommerceError,
} from "@/core/channel-experience/customer/commerce-errors";
import type { CustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import {
  resolveCustomerOrderContext,
  type CustomerOrderContext,
} from "@/core/channel-experience/customer/order-context";
import { PAYMENT_FINANCIAL_INSTRUCTION_TYPES } from "@/modules/payments/constants";
import { createPaymentObligationRepository } from "@/modules/payments/repositories/payment-obligation-repository";
import type { PaymentObligationRecord } from "@/modules/payments/types";

export type CustomerPaymentObligationContext = {
  order: CustomerOrderContext;
  obligation: PaymentObligationRecord;
  partyId: string | null;
};

/**
 * Resolve authorized order → SALE obligation for Customer Web payment.
 * Re-reads canonical BP-007 obligation (never trust client balances).
 */
export async function resolveCustomerPaymentObligationContext(
  store: CustomerWebStoreContext,
  orderReference: string
): Promise<CustomerPaymentObligationContext> {
  const order = await resolveCustomerOrderContext(store, orderReference);

  const obligations = createPaymentObligationRepository();
  const obligation = await obligations.findByOrderInstruction(
    order.businessId,
    order.orderId,
    PAYMENT_FINANCIAL_INSTRUCTION_TYPES.SALE
  );

  if (!obligation || obligation.businessId !== order.businessId) {
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.OBLIGATION_NOT_AVAILABLE,
      "This payment is not available.",
      403
    );
  }

  /**
   * D-05-06 — Canonical Party linkage on the obligation must match the
   * authorized order Party when both are present. Opaque obligation IDs
   * alone never authorize access.
   */
  const orderPartyId = order.partyId ?? order.order.partyId ?? null;
  if (
    obligation.customerId &&
    orderPartyId &&
    obligation.customerId !== orderPartyId
  ) {
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.OBLIGATION_NOT_AVAILABLE,
      "This payment is not available.",
      403
    );
  }

  /**
   * Staff-originated obligations without Party linkage cannot be safely
   * attributed to a Customer Web actor beyond order resource scope.
   * Order access still applies; Party match is enforced when available.
   */
  if (
    store.session.partyId &&
    obligation.customerId &&
    store.session.partyId !== obligation.customerId
  ) {
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.OBLIGATION_NOT_AVAILABLE,
      "This payment is not available.",
      403
    );
  }

  return {
    order,
    obligation,
    partyId: orderPartyId ?? obligation.customerId,
  };
}
