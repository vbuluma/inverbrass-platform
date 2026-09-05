/**
 * Purpose:
 * ENG-003o — Customer Web cart as channel/session state only (D-03).
 *
 * Not a Sales/Order domain entity. Checkout later calls CREATE_SALE.
 */

import type {
  CustomerCartLine,
  CustomerCartState,
  CustomerWebSessionPayload,
} from "@/core/channel-experience/customer/types";

export function emptyCustomerCart(): CustomerCartState {
  return {
    lines: [],
    updatedAt: new Date().toISOString(),
  };
}

export function upsertCartLine(
  cart: CustomerCartState | null,
  line: CustomerCartLine
): CustomerCartState {
  const base = cart ?? emptyCustomerCart();
  const quantity = Math.max(0, Math.floor(line.quantity));
  const without = base.lines.filter((l) => l.offeringId !== line.offeringId);
  const lines =
    quantity === 0
      ? without
      : [...without, { offeringId: line.offeringId, quantity }];

  return {
    lines,
    updatedAt: new Date().toISOString(),
  };
}

export function withCart(
  session: CustomerWebSessionPayload,
  cart: CustomerCartState
): CustomerWebSessionPayload {
  return { ...session, cart };
}

/**
 * Contract marker for SL-CUS-001 — cart never becomes a BP-006 draft order here.
 */
export const CUSTOMER_CART_BOUNDARY = {
  storage: "CUSTOMER_WEB_SESSION",
  domainEntity: null,
  checkoutCapability: "CREATE_SALE",
} as const;
