/**
 * Purpose:
 * SL-CUS-004 — Shared Customer Web order application context resolver.
 *
 * Application/read context only — not a persisted entity.
 * Every server request must call this (or equivalent) before order/payment reads.
 */

import {
  CUSTOMER_COMMERCE_ERROR_CODES,
  CustomerCommerceError,
} from "@/core/channel-experience/customer/commerce-errors";
import type { CustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import {
  assertCustomerOrderAccess,
  extractCustomerWebScopeFromOrderMetadata,
} from "@/core/channel-experience/customer/order-resource-auth";
import type { CustomerResourceScope } from "@/core/channel-experience/customer/types";
import { createSalesOrderRepository } from "@/modules/sales/repositories/sales-order-repository";
import type { SalesOrderRecord } from "@/modules/sales/ports";

export type CustomerOrderContext = {
  businessId: string;
  partyId: string | null;
  guestSessionId: string;
  orderId: string;
  orderReference: string;
  order: SalesOrderRecord;
  resourceScope: CustomerResourceScope;
};

export function resourceScopeFromStore(
  store: CustomerWebStoreContext
): CustomerResourceScope {
  return {
    businessId: store.customerTenant.businessId,
    guestSessionId: store.session.sessionId,
    partyId: store.session.partyId,
  };
}

/**
 * Resolve + authorize a customer order by public order reference.
 * Does not trust client-supplied tenant/party/order ownership fields.
 */
export async function resolveCustomerOrderContext(
  store: CustomerWebStoreContext,
  orderReference: string
): Promise<CustomerOrderContext> {
  const trimmed = orderReference.trim();
  if (!trimmed) {
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
      "This purchase is not available.",
      403
    );
  }

  const resourceScope = resourceScopeFromStore(store);
  const orders = createSalesOrderRepository();
  const order = await orders.findByOrderNumber(
    store.customerTenant.businessId,
    trimmed
  );

  if (!order) {
    throw new CustomerCommerceError(
      CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
      "This purchase is not available.",
      403
    );
  }

  assertCustomerOrderAccess(resourceScope, {
    businessId: order.businessId,
    metadata: order.metadata,
    partyId: order.partyId ?? "",
  });

  const extracted = extractCustomerWebScopeFromOrderMetadata(
    order.businessId,
    order.metadata
  );

  return {
    businessId: order.businessId,
    partyId: extracted.partyId ?? order.partyId,
    guestSessionId: resourceScope.guestSessionId,
    orderId: order.id,
    orderReference: order.orderNumber,
    order,
    resourceScope,
  };
}
