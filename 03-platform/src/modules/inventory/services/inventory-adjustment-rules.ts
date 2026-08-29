/**
 * Purpose:
 * Domain rules for stock adjustments, damage, loss, and returns.
 * Does not post ledger movements and does not cancel reservations.
 *
 * Implementation Package:
 * BP-008 / IP-05 – Stock Adjustments, Damage, Loss & Returns
 */

import {
  compareInventoryQuantity,
  remainingInboundQuantity,
} from "@/core/inventory-engine";
import {
  INVENTORY_ADJUSTMENT_TYPES,
  INVENTORY_OPERATION_CODES,
  INVENTORY_OVER_RECEIPT_POLICIES,
  INVENTORY_RETURN_CONDITIONS,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import { normalizeOptionalText } from "@/modules/inventory/services/stock-item-rules";

const ADJUSTMENT_TYPE_SET = new Set<string>(Object.values(INVENTORY_ADJUSTMENT_TYPES));

export function allowNegativeStock(policy: string): boolean {
  return policy === INVENTORY_OVER_RECEIPT_POLICIES.ALLOW;
}

export function isInboundAdjustmentType(adjustmentType: string): boolean {
  return (
    adjustmentType === INVENTORY_ADJUSTMENT_TYPES.POSITIVE_ADJUSTMENT ||
    adjustmentType === INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN
  );
}

export function assertAdjustmentType(adjustmentType: string): string {
  const trimmed = adjustmentType.trim();
  if (!ADJUSTMENT_TYPE_SET.has(trimmed)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "adjustmentType",
    });
  }
  return trimmed;
}

export function assertAdjustmentReason(reason: string, notes?: string | null): string {
  const trimmed = reason.trim();
  if (!trimmed) {
    throw new InventoryError(INVENTORY_ERROR_CODES.ADJUSTMENT_REASON_REQUIRED, undefined, 400, {
      field: "reason",
    });
  }
  if (trimmed.toUpperCase() === "OTHER" && !normalizeOptionalText(notes)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.ADJUSTMENT_REASON_REQUIRED, undefined, 400, {
      field: "notes",
    });
  }
  return trimmed;
}

export function assertReturnCondition(condition?: string | null): string {
  const value = condition?.trim() || INVENTORY_RETURN_CONDITIONS.SALEABLE;
  if (
    value !== INVENTORY_RETURN_CONDITIONS.SALEABLE &&
    value !== INVENTORY_RETURN_CONDITIONS.DAMAGED &&
    value !== INVENTORY_RETURN_CONDITIONS.QUARANTINED
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "condition",
    });
  }
  return value;
}

export function operationCodeForAdjustmentType(adjustmentType: string): string {
  if (adjustmentType === INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN) {
    return INVENTORY_OPERATION_CODES.CUSTOMER_RETURN;
  }
  if (adjustmentType === INVENTORY_ADJUSTMENT_TYPES.SUPPLIER_RETURN) {
    return INVENTORY_OPERATION_CODES.SUPPLIER_RETURN;
  }
  return INVENTORY_OPERATION_CODES.STOCK_ADJUSTMENT;
}

export function createIdempotencyKey(params: {
  adjustmentType: string;
  externalReference?: string | null;
  idempotencyKey?: string | null;
}): string | null {
  const explicit = normalizeOptionalText(params.idempotencyKey);
  if (explicit) {
    return explicit;
  }
  const reference = normalizeOptionalText(params.externalReference);
  if (!reference) {
    return null;
  }
  if (params.adjustmentType === INVENTORY_ADJUSTMENT_TYPES.CUSTOMER_RETURN) {
    return `CREATE_CUSTOMER_RETURN:${reference}`;
  }
  return `CREATE_STOCK_ADJUSTMENT:${reference}`;
}

export function assertSufficientAvailableForDecrease(params: {
  requestedBase: string;
  available: string;
  onHand: string;
  policy: string;
}): void {
  if (allowNegativeStock(params.policy)) {
    return;
  }
  if (compareInventoryQuantity(params.requestedBase, params.available) > 0) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INSUFFICIENT_STOCK_FOR_ADJUSTMENT);
  }
  if (compareInventoryQuantity(params.requestedBase, params.onHand) > 0) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INSUFFICIENT_STOCK_FOR_ADJUSTMENT);
  }
}

export function remainingReturnableQuantity(originQuantity: string, alreadyReturned: string): string {
  return remainingInboundQuantity(originQuantity, alreadyReturned);
}

export function assertReturnWithinReturnable(params: {
  requestedBase: string;
  remainingReturnable: string;
}): void {
  if (compareInventoryQuantity(params.requestedBase, params.remainingReturnable) > 0) {
    throw new InventoryError(INVENTORY_ERROR_CODES.RETURN_QUANTITY_EXCEEDS_RETURNABLE);
  }
}

export function originIdFromMetadata(metadata: Record<string, unknown> | null): string | null {
  if (!metadata) {
    return null;
  }
  const originId = metadata.originId ?? metadata.salesOrderId ?? metadata.sourceId;
  return typeof originId === "string" && originId.trim() ? originId : null;
}
