/**
 * Purpose:
 * Domain rules for inbound receiving and opening-balance documents.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import {
  compareInventoryQuantity,
  isPositiveInventoryQuantity,
  multiplyInventoryAmount,
  remainingInboundQuantity,
} from "@/core/inventory-engine";
import {
  INVENTORY_DOCUMENT_STATUSES,
  INVENTORY_OVER_RECEIPT_POLICIES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { StockItemRecord } from "@/modules/inventory/types";

export function assertPositiveInboundQuantity(quantity: string, field = "quantity"): string {
  const trimmed = quantity.trim();
  if (!isPositiveInventoryQuantity(trimmed)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_QUANTITY, undefined, 400, { field });
  }
  return trimmed;
}

export function assertInboundValuation(input: {
  quantity: string;
  unitCost?: string | null;
  lineTotal?: string | null;
  currencyCode?: string | null;
}): {
  unitCost: string | null;
  lineTotal: string | null;
  currencyCode: string | null;
} {
  const unitCost = input.unitCost?.trim() || null;
  const lineTotal = input.lineTotal?.trim() || null;
  const currencyCode = input.currencyCode?.trim().toUpperCase() || null;
  if (!unitCost && !lineTotal) {
    return { unitCost: null, lineTotal: null, currencyCode };
  }
  if (!unitCost || !lineTotal) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_COST, undefined, 400, {
      field: "unitCost",
    });
  }
  if (!isPositiveInventoryQuantity(unitCost) && unitCost !== "0") {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_COST, undefined, 400, {
      field: "unitCost",
    });
  }
  const expected = multiplyInventoryAmount(input.quantity, unitCost);
  if (expected === null || compareInventoryQuantity(expected, lineTotal) !== 0) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_COST, undefined, 400, {
      field: "lineTotal",
    });
  }
  if (!currencyCode || currencyCode.length !== 3) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_COST, undefined, 400, {
      field: "currencyCode",
    });
  }
  return { unitCost, lineTotal, currencyCode };
}

export function assertOverReceiptAllowed(input: {
  received: string;
  expected: string | null;
  policy: string;
}): void {
  if (!input.expected) {
    return;
  }
  if (compareInventoryQuantity(input.received, input.expected) <= 0) {
    return;
  }
  if (
    input.policy === INVENTORY_OVER_RECEIPT_POLICIES.ALLOW ||
    input.policy === INVENTORY_OVER_RECEIPT_POLICIES.ALLOW_WITH_WARNING
  ) {
    return;
  }
  throw new InventoryError(INVENTORY_ERROR_CODES.OVER_RECEIPT_NOT_ALLOWED);
}

export function assertDraftEditable(status: string): void {
  if (status !== INVENTORY_DOCUMENT_STATUSES.DRAFT) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_EDITABLE);
  }
}

export function assertCanPost(status: string, requiresApproval: boolean): void {
  if (status === INVENTORY_DOCUMENT_STATUSES.POSTED) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_ALREADY_POSTED, undefined, 409);
  }
  if (
    status === INVENTORY_DOCUMENT_STATUSES.REJECTED ||
    status === INVENTORY_DOCUMENT_STATUSES.CANCELLED
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
  }
  if (requiresApproval && status !== INVENTORY_DOCUMENT_STATUSES.APPROVED) {
    throw new InventoryError(INVENTORY_ERROR_CODES.APPROVAL_REQUIRED);
  }
  if (
    !requiresApproval &&
    status !== INVENTORY_DOCUMENT_STATUSES.DRAFT &&
    status !== INVENTORY_DOCUMENT_STATUSES.SUBMITTED &&
    status !== INVENTORY_DOCUMENT_STATUSES.APPROVED
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_POSTABLE);
  }
}

export function assertCanCancel(status: string): void {
  if (status === INVENTORY_DOCUMENT_STATUSES.POSTED) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_CANCELLABLE);
  }
  if (
    status === INVENTORY_DOCUMENT_STATUSES.CANCELLED ||
    status === INVENTORY_DOCUMENT_STATUSES.REJECTED
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_CANCELLABLE);
  }
}

export function remainingQuantity(expected: string, received: string): string {
  return remainingInboundQuantity(expected, received);
}

export type InboundUomConversion = {
  enteredQuantity: string;
  enteredUomId: string;
  baseQuantity: string;
  baseUomId: string;
  conversionFactor: string;
};

export function resolveInboundBaseQuantity(params: {
  enteredQuantity: string;
  enteredUomId: string;
  stockItem: Pick<
    StockItemRecord,
    "baseUomId" | "purchaseUomId" | "salesUomId" | "conversionFactor"
  >;
}): InboundUomConversion {
  const enteredQuantity = assertPositiveInboundQuantity(params.enteredQuantity);
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
    if (baseQuantity === null || !isPositiveInventoryQuantity(baseQuantity)) {
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

export function receivingUomId(
  stockItem: Pick<StockItemRecord, "baseUomId" | "purchaseUomId">,
  requestedUomId?: string | null
): string {
  const requested = requestedUomId?.trim();
  if (requested) {
    return requested;
  }
  return stockItem.purchaseUomId ?? stockItem.baseUomId;
}

export function reservationUomId(
  stockItem: Pick<StockItemRecord, "baseUomId" | "salesUomId" | "purchaseUomId">,
  requestedUomId?: string | null
): string {
  const requested = requestedUomId?.trim();
  if (requested) {
    return requested;
  }
  return stockItem.salesUomId ?? stockItem.purchaseUomId ?? stockItem.baseUomId;
}

export function inboundExpectedScopeKey(header: {
  id: string;
  supplierReference?: string | null;
  deliveryNumber?: string | null;
}): string {
  return header.supplierReference?.trim() || header.deliveryNumber?.trim() || header.id;
}

export function parseOptionalDate(value: string | null | undefined): Date {
  if (!value || !value.trim()) {
    return new Date();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "date",
    });
  }
  return parsed;
}
