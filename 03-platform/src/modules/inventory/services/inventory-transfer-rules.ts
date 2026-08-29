/**
 * Purpose:
 * Pure lifecycle and quantity rules for stock transfers.
 *
 * Implementation Package:
 * BP-008 / IP-04 – Stock Transfers & Multi-Location
 */

import { compareInventoryQuantity, subtractInventoryQuantity } from "@/core/inventory-engine";
import { INVENTORY_TRANSFER_STATUSES } from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";

const ALLOWED: Record<string, string[]> = {
  [INVENTORY_TRANSFER_STATUSES.DRAFT]: [
    INVENTORY_TRANSFER_STATUSES.REQUESTED,
    INVENTORY_TRANSFER_STATUSES.APPROVAL_PENDING,
    INVENTORY_TRANSFER_STATUSES.CANCELLED,
  ],
  [INVENTORY_TRANSFER_STATUSES.REQUESTED]: [
    INVENTORY_TRANSFER_STATUSES.APPROVAL_PENDING,
    INVENTORY_TRANSFER_STATUSES.DISPATCHED,
    INVENTORY_TRANSFER_STATUSES.IN_TRANSIT,
    INVENTORY_TRANSFER_STATUSES.CANCELLED,
  ],
  [INVENTORY_TRANSFER_STATUSES.APPROVAL_PENDING]: [
    INVENTORY_TRANSFER_STATUSES.APPROVED,
    INVENTORY_TRANSFER_STATUSES.REJECTED,
  ],
  [INVENTORY_TRANSFER_STATUSES.APPROVED]: [
    INVENTORY_TRANSFER_STATUSES.DISPATCHED,
    INVENTORY_TRANSFER_STATUSES.IN_TRANSIT,
    INVENTORY_TRANSFER_STATUSES.CANCELLED,
  ],
  [INVENTORY_TRANSFER_STATUSES.DISPATCHED]: [INVENTORY_TRANSFER_STATUSES.IN_TRANSIT],
  [INVENTORY_TRANSFER_STATUSES.IN_TRANSIT]: [
    INVENTORY_TRANSFER_STATUSES.RECEIVED,
    INVENTORY_TRANSFER_STATUSES.DISCREPANCY,
  ],
  [INVENTORY_TRANSFER_STATUSES.RECEIVED]: [INVENTORY_TRANSFER_STATUSES.COMPLETED],
};

const IN_TRANSIT_STATUSES = new Set<string>([
  INVENTORY_TRANSFER_STATUSES.DISPATCHED,
  INVENTORY_TRANSFER_STATUSES.IN_TRANSIT,
  INVENTORY_TRANSFER_STATUSES.DISCREPANCY,
]);

const PRE_DISPATCH_CANCEL = new Set<string>([
  INVENTORY_TRANSFER_STATUSES.DRAFT,
  INVENTORY_TRANSFER_STATUSES.REQUESTED,
  INVENTORY_TRANSFER_STATUSES.APPROVED,
]);

export function assertDistinctLocations(sourceLocationId: string, destinationLocationId: string) {
  if (sourceLocationId.trim() === destinationLocationId.trim()) {
    throw new InventoryError(INVENTORY_ERROR_CODES.SAME_LOCATION_TRANSFER);
  }
}

export function assertTransferTransition(from: string, to: string) {
  if (!(ALLOWED[from] ?? []).includes(to)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_ACTIONABLE);
  }
}

export function assertTransferCancellable(status: string) {
  if (!PRE_DISPATCH_CANCEL.has(status)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_CANCELLABLE);
  }
}

export function isInTransitStatus(status: string) {
  return IN_TRANSIT_STATUSES.has(status);
}

export function assertTransferOverReceipt(received: string, dispatched: string) {
  if (compareInventoryQuantity(received, dispatched) > 0) {
    throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_OVER_RECEIPT);
  }
}

export function discrepancyFromReceipt(dispatched: string, received: string) {
  if (compareInventoryQuantity(dispatched, received) <= 0) {
    return "0";
  }
  return subtractInventoryQuantity(dispatched, received);
}

export function remainingInTransit(dispatched: string, received: string | null) {
  return discrepancyFromReceipt(dispatched, received ?? "0");
}
