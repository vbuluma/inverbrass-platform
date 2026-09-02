/**
 * Purpose:
 * Domain rules for stock reservation and sales deduction.
 * Does not post ledger movements and does not read payment status.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import {
  compareInventoryQuantity,
  remainingInboundQuantity,
} from "@/core/inventory-engine";
import {
  INVENTORY_OVER_RECEIPT_POLICIES,
  INVENTORY_RESERVATION_STATUSES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { InventorySalesFulfilmentContract } from "@/modules/inventory/types";

const FULFILLABLE_ORDER_STATUSES = new Set([
  "CONFIRMED",
  "IN_PROGRESS",
  "PARTIALLY_FULFILLED",
]);

const BLOCKED_LINE_STATUSES = new Set(["CANCELLED", "BLOCKED"]);

export function allowNegativeStock(policy: string): boolean {
  return policy === INVENTORY_OVER_RECEIPT_POLICIES.ALLOW;
}

export function allowPartialReservation(policy: string): boolean {
  return policy === INVENTORY_OVER_RECEIPT_POLICIES.ALLOW_WITH_WARNING;
}

export function assertSufficientAvailable(params: {
  requestedBase: string;
  available: string;
  policy: string;
}): string {
  if (compareInventoryQuantity(params.requestedBase, params.available) <= 0) {
    return params.requestedBase;
  }
  if (allowNegativeStock(params.policy)) {
    return params.requestedBase;
  }
  if (
    allowPartialReservation(params.policy) &&
    compareInventoryQuantity(params.available, "0") > 0
  ) {
    return params.available;
  }
  throw new InventoryError(INVENTORY_ERROR_CODES.INSUFFICIENT_AVAILABLE_STOCK);
}

export function assertDeductionWithinReservation(params: {
  requestedBase: string;
  remainingReserved: string;
}): void {
  if (compareInventoryQuantity(params.requestedBase, params.remainingReserved) > 0) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DEDUCTION_EXCEEDS_RESERVATION);
  }
}

export function assertOnHandCoversDeduction(params: {
  onHand: string;
  deductedBase: string;
  policy: string;
}): void {
  if (compareInventoryQuantity(params.onHand, params.deductedBase) >= 0) {
    return;
  }
  if (allowNegativeStock(params.policy)) {
    return;
  }
  throw new InventoryError(INVENTORY_ERROR_CODES.NEGATIVE_STOCK_NOT_ALLOWED);
}

export function nextReservationStatus(params: {
  current: string;
  baseQuantity: string;
  fulfilledQuantity: string;
}): string {
  if (compareInventoryQuantity(params.fulfilledQuantity, params.baseQuantity) >= 0) {
    return INVENTORY_RESERVATION_STATUSES.FULFILLED;
  }
  if (compareInventoryQuantity(params.fulfilledQuantity, "0") > 0) {
    return INVENTORY_RESERVATION_STATUSES.PARTIALLY_FULFILLED;
  }
  return params.current === INVENTORY_RESERVATION_STATUSES.REQUESTED
    ? INVENTORY_RESERVATION_STATUSES.REQUESTED
    : INVENTORY_RESERVATION_STATUSES.RESERVED;
}

export function remainingReservedQuantity(baseQuantity: string, fulfilledQuantity: string): string {
  return remainingInboundQuantity(baseQuantity, fulfilledQuantity);
}

export function isActiveReservationStatus(status: string): boolean {
  return (
    status === INVENTORY_RESERVATION_STATUSES.RESERVED ||
    status === INVENTORY_RESERVATION_STATUSES.PARTIALLY_FULFILLED
  );
}

export function isReleasableStatus(status: string): boolean {
  return isActiveReservationStatus(status);
}

export function isFulfillableStatus(status: string): boolean {
  return isActiveReservationStatus(status);
}

export function isReservationExpired(expiresAt: Date | null, now = new Date()): boolean {
  return Boolean(expiresAt && expiresAt.getTime() <= now.getTime());
}

export function assertSaleReservable(contract: InventorySalesFulfilmentContract): void {
  if (!FULFILLABLE_ORDER_STATUSES.has(contract.operationalStatus)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.SALE_NOT_FULFILLABLE);
  }
}

export function assertSaleDeductible(contract: InventorySalesFulfilmentContract): void {
  assertSaleReservable(contract);
}

export function assertSaleCancelled(contract: InventorySalesFulfilmentContract): void {
  if (contract.operationalStatus !== "CANCELLED") {
    throw new InventoryError(INVENTORY_ERROR_CODES.SALE_NOT_FULFILLABLE);
  }
}

export function resolveSaleFulfilQuantity(
  explicitQuantity: string | undefined,
  remainingReserved: string
): string {
  const explicit = explicitQuantity?.trim();
  if (explicit) {
    return explicit;
  }
  return remainingReserved;
}

export function requirePhysicalSaleLine(
  contract: InventorySalesFulfilmentContract,
  salesOrderLineId: string
) {
  const line = contract.lines.find((row) => row.orderLineId === salesOrderLineId);
  if (!line) {
    throw new InventoryError(INVENTORY_ERROR_CODES.SALE_LINE_NOT_FOUND, undefined, 404);
  }
  if (line.lineType !== "PHYSICAL" || BLOCKED_LINE_STATUSES.has(line.fulfilmentStatus)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.SALE_NOT_FULFILLABLE);
  }
  return line;
}
