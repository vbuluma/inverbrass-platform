/**
 * Purpose:
 * SL-CUS-001 — Customer Web commerce Server Actions.
 */

"use server";

import { resolveCustomerWebStoreContext } from "@/core/channel-experience/customer/context";
import { createCustomerCommerceService } from "@/core/channel-experience/customer/commerce-service";
import {
  CustomerCommerceError,
  CUSTOMER_COMMERCE_ERROR_CODES,
} from "@/core/channel-experience/customer/commerce-errors";
import type {
  CustomerSafeCatalogueItem,
  CustomerSafePurchaseResult,
  CustomerSafeStockView,
} from "@/core/channel-experience/customer/dto";
import type { CustomerCartLine } from "@/core/channel-experience/customer/types";

export type CustomerCommerceActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; code: string; message: string };

function mapError(error: unknown): CustomerCommerceActionResult<never> {
  if (error instanceof CustomerCommerceError) {
    return { ok: false, code: error.code, message: error.message };
  }
  return {
    ok: false,
    code: CUSTOMER_COMMERCE_ERROR_CODES.CHECKOUT_FAILED,
    message: "Something went wrong. Please try again.",
  };
}

export async function listStoreCatalogueAction(
  businessCode: string
): Promise<CustomerCommerceActionResult<CustomerSafeCatalogueItem[]>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const data = await createCustomerCommerceService().listCatalogue(store);
    return { ok: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function getOfferingAvailabilityAction(
  businessCode: string,
  offeringCode: string
): Promise<CustomerCommerceActionResult<CustomerSafeStockView>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const data = await createCustomerCommerceService().getAvailability(
      store,
      offeringCode
    );
    return { ok: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function updateCartAction(
  businessCode: string,
  line: CustomerCartLine
): Promise<CustomerCommerceActionResult<{ quantity: number }>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const session = await createCustomerCommerceService().updateCart(store, line);
    const current = session.cart?.lines.find(
      (cartLine: CustomerCartLine) => cartLine.offeringId === line.offeringId
    );
    return { ok: true, data: { quantity: current?.quantity ?? 0 } };
  } catch (error) {
    return mapError(error);
  }
}

export async function checkoutAction(
  businessCode: string,
  input: { clientCheckoutKey: string }
): Promise<CustomerCommerceActionResult<CustomerSafePurchaseResult>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const data = await createCustomerCommerceService().checkout(store, input);
    return { ok: true, data };
  } catch (error) {
    return mapError(error);
  }
}

export async function getPurchaseByReferenceAction(
  businessCode: string,
  orderReference: string
): Promise<CustomerCommerceActionResult<CustomerSafePurchaseResult>> {
  try {
    const store = await resolveCustomerWebStoreContext(businessCode);
    const data = await createCustomerCommerceService().getOrderByReference(
      store,
      orderReference
    );
    return { ok: true, data };
  } catch (error) {
    return mapError(error);
  }
}
