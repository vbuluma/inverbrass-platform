/**
 * Purpose:
 * SL-CUS-003 — Customer Web quotation Server Actions.
 *
 * Adapts Web input → ENG-003o → BP-004. Does not own quotation business rules.
 */

"use server";

import { resolveCustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import {
  CustomerCommerceError,
  CUSTOMER_COMMERCE_ERROR_CODES,
} from "@/core/channel-experience/customer/commerce-errors";
import type { CustomerSafeQuotationView } from "@/core/channel-experience/customer/dto";
import {
  createCustomerWebQuotationAdapter,
  type CustomerQuotationRequestInput,
} from "@/core/channel-experience/customer/quotation-adapter";
import { ChannelExperienceError } from "@/core/channel-experience/errors";

export type CustomerQuotationActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

function mapError(error: unknown): CustomerQuotationActionResult<never> {
  if (error instanceof CustomerCommerceError) {
    return { ok: false, code: error.code, message: error.message };
  }
  if (error instanceof ChannelExperienceError) {
    return { ok: false, code: error.code, message: error.message };
  }
  return {
    ok: false,
    code: CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
    message: "Something went wrong. Please try again.",
  };
}

export async function submitQuotationRequestAction(
  businessCode: string,
  input: CustomerQuotationRequestInput
): Promise<CustomerQuotationActionResult<CustomerSafeQuotationView>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const data = await createCustomerWebQuotationAdapter().requestQuotation(
      store,
      input
    );
    return { ok: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function getQuotationStatusAction(
  businessCode: string,
  quotationReference: string
): Promise<CustomerQuotationActionResult<CustomerSafeQuotationView>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const data = await createCustomerWebQuotationAdapter().getQuotation(
      store,
      quotationReference
    );
    return { ok: true, data };
  } catch (error) {
    return mapError(error);
  }
}
