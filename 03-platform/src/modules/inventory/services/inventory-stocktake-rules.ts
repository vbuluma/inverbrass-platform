/**
 * Purpose:
 * Domain rules for physical stocktake and variance. Does not post ledger
 * movements. Reconciliation uses the existing adjustment service.
 *
 * Implementation Package:
 * BP-008 / IP-06 – Stocktake & Inventory Reconciliation
 */

import {
  compareInventoryQuantity,
  isNonNegativeInventoryQuantity,
  isPositiveInventoryQuantity,
  multiplyInventoryAmount,
  subtractInventoryQuantity,
} from "@/core/inventory-engine";
import {
  INVENTORY_STOCKTAKE_SCOPE_TYPES,
  INVENTORY_STOCKTAKE_STATUSES,
  INVENTORY_VARIANCE_CLASSES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { InboundUomConversion } from "@/modules/inventory/services/inventory-inbound-rules";
import { normalizeOptionalText } from "@/modules/inventory/services/stock-item-rules";
import type { StockItemRecord } from "@/modules/inventory/types";

const SCOPE_SET = new Set<string>(Object.values(INVENTORY_STOCKTAKE_SCOPE_TYPES));

export function assertStocktakeScopeType(scopeType: string): string {
  const trimmed = scopeType.trim();
  if (!SCOPE_SET.has(trimmed)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "scopeType",
    });
  }
  return trimmed;
}

export function createStocktakeIdempotencyKey(key?: string | null): string | null {
  return normalizeOptionalText(key);
}

export function classifyVariance(variance: string): string {
  const compared = compareInventoryQuantity(variance, "0");
  if (compared > 0) {
    return INVENTORY_VARIANCE_CLASSES.POSITIVE;
  }
  if (compared < 0) {
    return INVENTORY_VARIANCE_CLASSES.NEGATIVE;
  }
  return INVENTORY_VARIANCE_CLASSES.ZERO;
}

export function computeVariance(countedBase: string, snapshotBase: string): string {
  return subtractInventoryQuantity(countedBase, snapshotBase);
}

export function assertStocktakeCountable(status: string): void {
  if (status !== INVENTORY_STOCKTAKE_STATUSES.IN_PROGRESS) {
    throw new InventoryError(INVENTORY_ERROR_CODES.STOCKTAKE_NOT_COUNTABLE);
  }
}

export function assertStocktakeCanSubmit(status: string): void {
  if (status !== INVENTORY_STOCKTAKE_STATUSES.IN_PROGRESS) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
  }
}

export function assertStocktakeCanApprove(status: string): void {
  if (
    status !== INVENTORY_STOCKTAKE_STATUSES.SUBMITTED &&
    status !== INVENTORY_STOCKTAKE_STATUSES.APPROVAL_PENDING
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
  }
}

export function assertStocktakeCanPost(status: string, requiresApproval: boolean): void {
  if (
    status === INVENTORY_STOCKTAKE_STATUSES.POSTED ||
    status === INVENTORY_STOCKTAKE_STATUSES.COMPLETED
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_ALREADY_POSTED, undefined, 409);
  }
  if (requiresApproval && status !== INVENTORY_STOCKTAKE_STATUSES.APPROVED) {
    throw new InventoryError(INVENTORY_ERROR_CODES.APPROVAL_REQUIRED);
  }
  if (
    !requiresApproval &&
    status !== INVENTORY_STOCKTAKE_STATUSES.SUBMITTED &&
    status !== INVENTORY_STOCKTAKE_STATUSES.APPROVED
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
  }
}

export function assertStocktakeCanCancel(status: string): void {
  if (
    status === INVENTORY_STOCKTAKE_STATUSES.POSTED ||
    status === INVENTORY_STOCKTAKE_STATUSES.COMPLETED
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_CANCELLABLE);
  }
  if (status === INVENTORY_STOCKTAKE_STATUSES.CANCELLED) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_CANCELLABLE);
  }
}

export function assertStocktakeCanComplete(status: string): void {
  if (status !== INVENTORY_STOCKTAKE_STATUSES.POSTED) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
  }
}

export function assertStocktakeEditable(status: string): void {
  if (
    status === INVENTORY_STOCKTAKE_STATUSES.POSTED ||
    status === INVENTORY_STOCKTAKE_STATUSES.COMPLETED ||
    status === INVENTORY_STOCKTAKE_STATUSES.CANCELLED
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_EDITABLE);
  }
}

function assertNonNegativeCount(quantity: string): string {
  const trimmed = quantity.trim();
  if (!isNonNegativeInventoryQuantity(trimmed)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_QUANTITY, undefined, 400, {
      field: "quantity",
    });
  }
  return trimmed;
}

export function resolvePhysicalCountBaseQuantity(params: {
  enteredQuantity: string;
  enteredUomId: string;
  stockItem: Pick<
    StockItemRecord,
    "baseUomId" | "purchaseUomId" | "salesUomId" | "conversionFactor"
  >;
}): InboundUomConversion {
  const enteredQuantity = assertNonNegativeCount(params.enteredQuantity);
  if (params.enteredUomId === params.stockItem.baseUomId) {
    return {
      enteredQuantity,
      enteredUomId: params.enteredUomId,
      baseQuantity: enteredQuantity,
      baseUomId: params.stockItem.baseUomId,
      conversionFactor: "1",
    };
  }
  if (
    (params.stockItem.purchaseUomId &&
      params.enteredUomId === params.stockItem.purchaseUomId) ||
    (params.stockItem.salesUomId && params.enteredUomId === params.stockItem.salesUomId)
  ) {
    const factor = params.stockItem.conversionFactor?.trim() ?? "";
    if (!factor) {
      throw new InventoryError(INVENTORY_ERROR_CODES.CONVERSION_REQUIRED, undefined, 400, {
        field: "uomId",
      });
    }
    if (!isPositiveInventoryQuantity(factor)) {
      throw new InventoryError(
        INVENTORY_ERROR_CODES.INVALID_CONVERSION_FACTOR,
        undefined,
        400,
        { field: "conversionFactor" }
      );
    }
    const baseQuantity = multiplyInventoryAmount(enteredQuantity, factor);
    if (baseQuantity === null || !isNonNegativeInventoryQuantity(baseQuantity)) {
      throw new InventoryError(
        INVENTORY_ERROR_CODES.INVALID_CONVERSION_FACTOR,
        undefined,
        400,
        { field: "conversionFactor" }
      );
    }
    return {
      enteredQuantity,
      enteredUomId: params.enteredUomId,
      baseQuantity,
      baseUomId: params.stockItem.baseUomId,
      conversionFactor: factor,
    };
  }
  throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_UOM, undefined, 400, {
    field: "uomId",
  });
}
