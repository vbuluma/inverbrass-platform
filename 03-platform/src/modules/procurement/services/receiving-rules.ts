/**
 * Purpose:
 * Pure BP-009 IP-08 receiving and fulfilment rules.
 * Does not write inventory balances.
 */

import {
  LINE_FULFILMENT_STATUSES,
  OVER_RECEIPT_POLICIES,
  PO_FULFILMENT_STATUSES,
  PO_LINE_TYPES,
  PO_STATUSES,
  RECEIPT_STATUSES,
  RECEIPT_TYPES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";

const RECEIVABLE_PO_STATUSES_WITH_ACCEPTANCE = new Set<string>([
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.PARTIALLY_FULFILLED,
]);

const RECEIVABLE_PO_STATUSES_WITHOUT_ACCEPTANCE = new Set<string>([
  PO_STATUSES.ISSUED,
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.PARTIALLY_FULFILLED,
]);

const BLOCKED_PO_STATUSES = new Set<string>([
  PO_STATUSES.DRAFT,
  PO_STATUSES.PENDING_APPROVAL,
  PO_STATUSES.APPROVED,
  PO_STATUSES.CANCELLED,
  PO_STATUSES.CLOSED,
  PO_STATUSES.REJECTED,
]);

export function parseReceiptQuantity(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

export function assertPositiveReceiptQuantity(quantity: string) {
  if (parseReceiptQuantity(quantity) <= 0) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_RECEIPT_QUANTITY, undefined, 400, {
      field: "quantityReceived",
    });
  }
}

export function assertPoEligibleForReceipt(
  status: string,
  requiresSupplierAcceptance: boolean
) {
  if (BLOCKED_PO_STATUSES.has(status)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_NOT_RECEIVABLE, undefined, 409);
  }
  const allowed = requiresSupplierAcceptance
    ? RECEIVABLE_PO_STATUSES_WITH_ACCEPTANCE
    : RECEIVABLE_PO_STATUSES_WITHOUT_ACCEPTANCE;
  if (!allowed.has(status)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_NOT_RECEIVABLE, undefined, 409);
  }
}

export function sumReceivedQuantities(quantities: string[]): string {
  const total = quantities.reduce((sum, row) => sum + parseReceiptQuantity(row), 0);
  return total.toFixed(6).replace(/\.?0+$/, "") || "0";
}

export function computeOutstandingQuantity(orderedQuantity: string, receivedQuantities: string[]) {
  const ordered = parseReceiptQuantity(orderedQuantity);
  const received = parseReceiptQuantity(sumReceivedQuantities(receivedQuantities));
  return Math.max(ordered - received, 0).toFixed(6).replace(/\.?0+$/, "") || "0";
}

export function deriveLineFulfilmentStatus(input: {
  orderedQuantity: string;
  receivedQuantities: string[];
  promisedDeliveryDate: string | null;
  today?: string;
}) {
  const ordered = parseReceiptQuantity(input.orderedQuantity);
  const received = parseReceiptQuantity(sumReceivedQuantities(input.receivedQuantities));
  const outstanding = Math.max(ordered - received, 0);
  const today = input.today ?? new Date().toISOString().slice(0, 10);
  if (
    outstanding > 0 &&
    input.promisedDeliveryDate &&
    input.promisedDeliveryDate < today
  ) {
    return LINE_FULFILMENT_STATUSES.OVERDUE;
  }
  if (received <= 0) {
    return LINE_FULFILMENT_STATUSES.NOT_RECEIVED;
  }
  if (outstanding > 0) {
    return LINE_FULFILMENT_STATUSES.PARTIALLY_FULFILLED;
  }
  return LINE_FULFILMENT_STATUSES.FULFILLED;
}

export function derivePoFulfilmentStatus(lineStatuses: string[]) {
  if (lineStatuses.length === 0) {
    return PO_FULFILMENT_STATUSES.NOT_FULFILLED;
  }
  const allFulfilled = lineStatuses.every(
    (status) => status === LINE_FULFILMENT_STATUSES.FULFILLED
  );
  if (allFulfilled) {
    return PO_FULFILMENT_STATUSES.FULFILLED;
  }
  const anyProgress = lineStatuses.some(
    (status) =>
      status === LINE_FULFILMENT_STATUSES.PARTIALLY_FULFILLED ||
      status === LINE_FULFILMENT_STATUSES.FULFILLED
  );
  return anyProgress
    ? PO_FULFILMENT_STATUSES.PARTIALLY_FULFILLED
    : PO_FULFILMENT_STATUSES.NOT_FULFILLED;
}

export function assertOverReceiptPolicy(input: {
  policy: string;
  outstandingQuantity: string;
  quantityReceived: string;
}) {
  const outstanding = parseReceiptQuantity(input.outstandingQuantity);
  const received = parseReceiptQuantity(input.quantityReceived);
  if (received <= outstanding) {
    return { overDelivery: false };
  }
  if (input.policy === OVER_RECEIPT_POLICIES.ALLOW_EXCEPTION) {
    return { overDelivery: true };
  }
  throw new ProcurementError(PROCUREMENT_ERROR_CODES.OVER_RECEIPT_BLOCKED, undefined, 409);
}

export function receiptTypeForLineType(lineType: string): string {
  switch (lineType.trim().toUpperCase()) {
    case PO_LINE_TYPES.ASSET:
      return RECEIPT_TYPES.ASSET_RECEIPT;
    case PO_LINE_TYPES.SERVICE:
      return RECEIPT_TYPES.SERVICE_CONFIRMATION;
    default:
      return RECEIPT_TYPES.GOODS_RECEIPT;
  }
}

export function documentTypeForReceipt(receiptType: string): string {
  switch (receiptType) {
    case RECEIPT_TYPES.ASSET_RECEIPT:
      return "PROCUREMENT_ASSET_RECEIPT";
    case RECEIPT_TYPES.SERVICE_CONFIRMATION:
      return "PROCUREMENT_SERVICE_CONFIRMATION";
    default:
      return "PROCUREMENT_GOODS_RECEIPT";
  }
}

export function receiptNumberPrefix(receiptType: string): string {
  switch (receiptType) {
    case RECEIPT_TYPES.ASSET_RECEIPT:
      return "AREC";
    case RECEIPT_TYPES.SERVICE_CONFIRMATION:
      return "SVC";
    default:
      return "GREC";
  }
}

export function isConfirmedReceiptStatus(status: string) {
  return status === RECEIPT_STATUSES.CONFIRMED;
}

export function buildHandoffIdempotencyKey(
  receiptId: string,
  receiptLineId: string,
  handoffType: string
) {
  return `${receiptId}:${receiptLineId}:${handoffType}`;
}

export function requiresInventoryHandoff(receiptType: string) {
  return receiptType === RECEIPT_TYPES.GOODS_RECEIPT;
}

export function requiresAssetHandoff(receiptType: string) {
  return receiptType === RECEIPT_TYPES.ASSET_RECEIPT;
}

export function serviceReceiptRequiresPeriod(receiptType: string) {
  return receiptType === RECEIPT_TYPES.SERVICE_CONFIRMATION;
}
