/**
 * Purpose:
 * SL-CUS-004 — Customer Web Order Tracking Adapter (channel-specific).
 *
 * Maps Customer Web → ENG-003o VIEW_ORDER → BP-006.
 * Does NOT own order lifecycle, totals, or persistence.
 */

import { invokeCustomerWebCapability } from "@/core/channel-experience/customer/adapter";
import {
  CUSTOMER_COMMERCE_ERROR_CODES,
  CustomerCommerceError,
} from "@/core/channel-experience/customer/commerce-errors";
import type { CustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import {
  toCustomerSafeOrderHubDetail,
  toCustomerSafeOrderListItem,
  type CustomerSafeOrderHubDetail,
  type CustomerSafeOrderListItem,
} from "@/core/channel-experience/customer/dto";
import {
  assertDomainTenantMatches,
  buildCustomerDomainContext,
} from "@/core/channel-experience/customer/domain-context";
import {
  resolveCustomerOrderContext,
  resourceScopeFromStore,
} from "@/core/channel-experience/customer/order-context";
import { extractCustomerWebScopeFromOrderMetadata } from "@/core/channel-experience/customer/order-resource-auth";
import { loadCanonicalPaymentForAuthorizedOrder } from "@/core/channel-experience/customer/payment-adapter";
import { canAccessCustomerResource } from "@/core/channel-experience/customer/resource-scope";
import { SALES_CUSTOMER_WEB_CONFIRMATION_POLICY } from "@/modules/sales/constants";
import { createSalesOrderRepository } from "@/modules/sales/repositories/sales-order-repository";
import {
  createDefaultSalesOrderDependencies,
  createSalesOrderService,
} from "@/modules/sales/services/sales-order-service";

function createCustomerSalesOrderService() {
  return createSalesOrderService({
    ...createDefaultSalesOrderDependencies(),
    confirmationPolicy: SALES_CUSTOMER_WEB_CONFIRMATION_POLICY,
  });
}

export class CustomerWebOrderTrackingAdapter {
  async listMyOrders(
    store: CustomerWebStoreContext
  ): Promise<CustomerSafeOrderListItem[]> {
    const response = await invokeCustomerWebCapability(
      "VIEW_ORDER",
      store,
      async (execution) => {
        const domainContext = buildCustomerDomainContext(
          execution.customerTenant,
          execution.identity
        );
        assertDomainTenantMatches(
          domainContext,
          store.customerTenant
        );

        const scope = resourceScopeFromStore(store);
        const orders = createSalesOrderRepository();
        const candidates = await orders.listCandidatesForCustomerWebScope(
          scope.businessId,
          {
            partyId: scope.partyId,
            guestSessionId: scope.guestSessionId,
          }
        );

        const authorized = candidates.filter((order) => {
          const extracted = extractCustomerWebScopeFromOrderMetadata(
            order.businessId,
            order.metadata
          );
          return canAccessCustomerResource(scope, {
            businessId: order.businessId,
            guestSessionId: extracted.guestSessionId,
            partyId: extracted.partyId ?? order.partyId,
          });
        });

        const items: CustomerSafeOrderListItem[] = [];

        for (const order of authorized) {
          const payment = await loadCanonicalPaymentForAuthorizedOrder({
            businessId: order.businessId,
            orderId: order.id,
            orderReference: order.orderNumber,
            expectedAmount: order.expectedAmount,
            currencyCode: order.currencyCode,
          });

          items.push(
            toCustomerSafeOrderListItem({
              orderReference: order.orderNumber,
              orderDate: order.orderDate.toISOString(),
              orderStatusCode: order.status,
              totalAmount: order.expectedAmount,
              currencyCode: order.currencyCode,
              paymentStatusCode: payment.paymentStatusCode,
            })
          );
        }

        return items;
      }
    );

    return response.data;
  }

  async getOrderHubDetail(
    store: CustomerWebStoreContext,
    orderReference: string
  ): Promise<CustomerSafeOrderHubDetail> {
    const response = await invokeCustomerWebCapability(
      "VIEW_ORDER",
      store,
      async (execution) => {
        const domainContext = buildCustomerDomainContext(
          execution.customerTenant,
          execution.identity
        );
        assertDomainTenantMatches(
          domainContext,
          store.customerTenant
        );

        const orderContext = await resolveCustomerOrderContext(
          store,
          orderReference
        );

        const detail = await createCustomerSalesOrderService().getOrder(
          domainContext,
          orderContext.orderId
        );

        const payment = await loadCanonicalPaymentForAuthorizedOrder({
          businessId: orderContext.businessId,
          orderId: orderContext.orderId,
          orderReference: orderContext.orderReference,
          expectedAmount: detail.expectedAmount,
          currencyCode: detail.currencyCode,
        });

        return toCustomerSafeOrderHubDetail({
          orderReference: detail.orderNumber,
          orderDate:
            detail.createdAt ?? orderContext.order.orderDate.toISOString(),
          orderStatusCode: detail.status,
          currencyCode: detail.currencyCode,
          totalAmount: detail.expectedAmount,
          lines: detail.lines.map((line) => ({
            offeringCode: line.offeringCode,
            offeringName: line.offeringName,
            orderedQuantity: line.orderedQuantity,
            commercialLineAmount: line.commercialLineAmount,
            currencyCode: line.currencyCode,
          })),
          payment,
        });
      }
    );

    return response.data;
  }

  async getOrderByReference(
    store: CustomerWebStoreContext,
    orderReference: string
  ): Promise<CustomerSafeOrderHubDetail> {
    const trimmed = orderReference.trim();
    if (!trimmed) {
      throw new CustomerCommerceError(
        CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
        "This purchase is not available.",
        403
      );
    }
    return this.getOrderHubDetail(store, trimmed);
  }
}

export function createCustomerWebOrderTrackingAdapter(): CustomerWebOrderTrackingAdapter {
  return new CustomerWebOrderTrackingAdapter();
}
