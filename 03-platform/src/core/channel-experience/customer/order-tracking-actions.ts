/**
 * Purpose:
 * SL-CUS-004 — Customer Web order/payment tracking Server Actions.
 */

"use server";

import { resolveCustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import {
  CustomerCommerceError,
  CUSTOMER_COMMERCE_ERROR_CODES,
} from "@/core/channel-experience/customer/commerce-errors";
import type {
  CustomerSafeOrderHubDetail,
  CustomerSafeOrderListItem,
  CustomerSafeOrderPaymentView,
} from "@/core/channel-experience/customer/dto";
import { createCustomerWebOrderTrackingAdapter } from "@/core/channel-experience/customer/order-tracking-adapter";
import { createCustomerWebPaymentAdapter } from "@/core/channel-experience/customer/payment-adapter";

export type OrderTrackingActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

function mapError(error: unknown): OrderTrackingActionResult<never> {
  if (error instanceof CustomerCommerceError) {
    return { ok: false, code: error.code, message: error.message };
  }
  return {
    ok: false,
    code: CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
    message: "This purchase is not available.",
  };
}

export async function listMyOrdersAction(
  businessCode: string
): Promise<OrderTrackingActionResult<CustomerSafeOrderListItem[]>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const data =
      await createCustomerWebOrderTrackingAdapter().listMyOrders(store);
    return { ok: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function getOrderHubDetailAction(
  businessCode: string,
  orderReference: string
): Promise<OrderTrackingActionResult<CustomerSafeOrderHubDetail>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const data =
      await createCustomerWebOrderTrackingAdapter().getOrderHubDetail(
        store,
        orderReference
      );
    return { ok: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function getOrderPaymentStatusAction(
  businessCode: string,
  orderReference: string
): Promise<OrderTrackingActionResult<CustomerSafeOrderPaymentView>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const data =
      await createCustomerWebPaymentAdapter().getPaymentStatusForOrder(
        store,
        orderReference
      );
    return { ok: true, data };
  } catch (error) {
    return mapError(error);
  }
}
