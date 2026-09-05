/**
 * Purpose:
 * SL-CUS-005 — Customer Web payment Server Actions (pay-later).
 */

"use server";

import { resolveCustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import {
  CustomerCommerceError,
  CUSTOMER_COMMERCE_ERROR_CODES,
} from "@/core/channel-experience/customer/commerce-errors";
import type {
  CustomerSafeOrderPaymentView,
  CustomerSafePaymentInitiationResult,
} from "@/core/channel-experience/customer/dto";
import { createCustomerWebPaymentAdapter } from "@/core/channel-experience/customer/payment-adapter";

export type CustomerPaymentActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

function mapError(error: unknown): CustomerPaymentActionResult<never> {
  if (error instanceof CustomerCommerceError) {
    return { ok: false, code: error.code, message: error.message };
  }
  return {
    ok: false,
    code: CUSTOMER_COMMERCE_ERROR_CODES.PAYMENT_FAILED,
    message: "The payment could not be completed. Please try again.",
  };
}

export async function getPayablePaymentStatusAction(
  businessCode: string,
  orderReference: string
): Promise<CustomerPaymentActionResult<CustomerSafeOrderPaymentView>> {
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

export async function initiateOutstandingPaymentAction(
  businessCode: string,
  input: {
    orderReference: string;
    amount?: string | null;
    clientPaymentKey: string;
  }
): Promise<CustomerPaymentActionResult<CustomerSafePaymentInitiationResult>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const data =
      await createCustomerWebPaymentAdapter().initiatePaymentForOrder(store, {
        orderReference: input.orderReference,
        amount: input.amount,
        clientPaymentKey: input.clientPaymentKey,
      });
    return { ok: true, data };
  } catch (error) {
    return mapError(error);
  }
}
