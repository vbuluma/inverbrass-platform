/**
 * Purpose:
 * Pure BP-009 IP-09 invoice matching rules.
 * Does not post GL, execute payment, or increment inventory.
 */

import {
  DUPLICATE_POLICIES,
  INSPECTION_STATUSES,
  INVOICE_STATUSES,
  MATCH_OUTCOMES,
  MATCH_VARIANCE_TYPES,
  MATCHING_MODES,
  PO_LINE_TYPES,
  PO_STATUSES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";

const INVOICE_PO_STATUSES = new Set<string>([
  PO_STATUSES.ISSUED,
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.PARTIALLY_FULFILLED,
  PO_STATUSES.FULFILLED,
]);

export function parseInvoiceAmount(value: string): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return 0;
  }
  return parsed;
}

export function formatInvoiceAmount(value: number): string {
  return value.toFixed(6).replace(/\.?0+$/, "") || "0";
}

export function computeLineAmounts(input: {
  quantity: string;
  unitPrice: string;
  taxRate?: string | null;
}) {
  const quantity = parseInvoiceAmount(input.quantity);
  const unitPrice = parseInvoiceAmount(input.unitPrice);
  const taxRate = parseInvoiceAmount(input.taxRate ?? "0");
  const lineSubtotal = quantity * unitPrice;
  const lineTax = lineSubtotal * (taxRate / 100);
  const lineTotal = lineSubtotal + lineTax;
  return {
    lineSubtotal: formatInvoiceAmount(lineSubtotal),
    lineTax: formatInvoiceAmount(lineTax),
    lineTotal: formatInvoiceAmount(lineTotal),
    taxRate: formatInvoiceAmount(taxRate),
  };
}

export function sumInvoiceLines(
  lines: Array<{ lineSubtotal: string; lineTax: string; lineTotal: string }>
) {
  const subtotal = lines.reduce((sum, row) => sum + parseInvoiceAmount(row.lineSubtotal), 0);
  const tax = lines.reduce((sum, row) => sum + parseInvoiceAmount(row.lineTax), 0);
  const total = lines.reduce((sum, row) => sum + parseInvoiceAmount(row.lineTotal), 0);
  return {
    subtotalAmount: formatInvoiceAmount(subtotal),
    taxAmount: formatInvoiceAmount(tax),
    totalAmount: formatInvoiceAmount(total),
  };
}

export function withinPercentTolerance(actual: number, expected: number, tolerancePercent: number) {
  if (expected === 0) {
    return actual === 0;
  }
  const variance = Math.abs(actual - expected);
  return variance <= Math.abs(expected) * (tolerancePercent / 100);
}

export function withinAmountTolerance(actual: number, expected: number, toleranceAmount: number) {
  return Math.abs(actual - expected) <= toleranceAmount;
}

export function buildMatchIdempotencyKey(invoiceId: string, version: number) {
  return `${invoiceId}:v${version}`;
}

export function buildApHandoffIdempotencyKey(invoiceId: string) {
  return `ap:${invoiceId}`;
}

export function invoiceStatusLabel(status: string) {
  switch (status) {
    case INVOICE_STATUSES.DRAFT:
      return "Draft";
    case INVOICE_STATUSES.CAPTURED:
      return "Captured";
    case INVOICE_STATUSES.MATCHED:
      return "Matched";
    case INVOICE_STATUSES.VARIANCE:
      return "Variance";
    case INVOICE_STATUSES.UNMATCHED:
      return "Unmatched";
    case INVOICE_STATUSES.DUPLICATE:
      return "Duplicate";
    case INVOICE_STATUSES.PENDING_APPROVAL:
      return "Pending approval";
    case INVOICE_STATUSES.APPROVED:
      return "Approved";
    case INVOICE_STATUSES.PAYMENT_READY:
      return "Payment ready";
    case INVOICE_STATUSES.REJECTED:
      return "Rejected";
    case INVOICE_STATUSES.CANCELLED:
      return "Cancelled";
    default:
      return status.replaceAll("_", " ");
  }
}

export function assertPoEligibleForInvoice(status: string) {
  if (!INVOICE_PO_STATUSES.has(status)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_NOT_RECEIVABLE, undefined, 409);
  }
}

export function resolveMatchingModeForLine(
  lineType: string,
  control: {
    defaultMatchingMode: string;
    requireReceiptForInventory: boolean;
    requireReceiptForAssets: boolean;
    requireReceiptForServices: boolean;
  },
  override?: string | null
) {
  if (override?.trim()) {
    return override.trim().toUpperCase();
  }
  switch (lineType.trim().toUpperCase()) {
    case PO_LINE_TYPES.SERVICE:
      return control.requireReceiptForServices
        ? MATCHING_MODES.THREE_WAY
        : MATCHING_MODES.TWO_WAY;
    case PO_LINE_TYPES.ASSET:
      return control.requireReceiptForAssets
        ? MATCHING_MODES.THREE_WAY
        : MATCHING_MODES.TWO_WAY;
    default:
      return control.requireReceiptForInventory
        ? MATCHING_MODES.THREE_WAY
        : control.defaultMatchingMode;
  }
}

export type LineMatchEvaluation = {
  withinTolerance: boolean;
  varianceType: string | null;
  varianceAmount: string | null;
  receiptQuantity: string | null;
  receiptLineId: string | null;
};

export function evaluateLineMatch(input: {
  matchingMode: string;
  poLine?: {
    id: string;
    quantity: string;
    lineTotal: string;
    lineType: string;
  } | null;
  invoiceLine: {
    id: string;
    quantity: string;
    lineTotal: string;
    lineTax: string;
  };
  receivedQuantity: string | null;
  receiptLineId: string | null;
  inspectionStatus: string | null;
  tolerances: {
    pricePercent: number;
    quantityPercent: number;
    taxAmount: number;
  };
}): LineMatchEvaluation {
  if (!input.poLine) {
    return {
      withinTolerance: false,
      varianceType: MATCH_VARIANCE_TYPES.PO_LINE_MISSING,
      varianceAmount: input.invoiceLine.lineTotal,
      receiptQuantity: input.receivedQuantity,
      receiptLineId: input.receiptLineId,
    };
  }

  const invoiceQty = parseInvoiceAmount(input.invoiceLine.quantity);
  const poQty = parseInvoiceAmount(input.poLine.quantity);
  const invoiceAmount = parseInvoiceAmount(input.invoiceLine.lineTotal);
  const poAmount = parseInvoiceAmount(input.poLine.lineTotal);
  const receivedQty = parseInvoiceAmount(input.receivedQuantity ?? "0");

  if (
    input.matchingMode === MATCHING_MODES.THREE_WAY ||
    input.matchingMode === MATCHING_MODES.FOUR_WAY
  ) {
    if (!input.receivedQuantity || receivedQty <= 0) {
      return {
        withinTolerance: false,
        varianceType: MATCH_VARIANCE_TYPES.RECEIPT_MISSING,
        varianceAmount: input.invoiceLine.quantity,
        receiptQuantity: input.receivedQuantity,
        receiptLineId: input.receiptLineId,
      };
    }
    if (
      !withinPercentTolerance(invoiceQty, receivedQty, input.tolerances.quantityPercent) &&
      invoiceQty > receivedQty
    ) {
      return {
        withinTolerance: false,
        varianceType: MATCH_VARIANCE_TYPES.QUANTITY,
        varianceAmount: formatInvoiceAmount(invoiceQty - receivedQty),
        receiptQuantity: input.receivedQuantity,
        receiptLineId: input.receiptLineId,
      };
    }
  }

  if (input.matchingMode === MATCHING_MODES.FOUR_WAY) {
    const inspection = input.inspectionStatus ?? INSPECTION_STATUSES.NOT_REQUIRED;
    if (inspection === INSPECTION_STATUSES.PENDING) {
      return {
        withinTolerance: false,
        varianceType: MATCH_VARIANCE_TYPES.INSPECTION_PENDING,
        varianceAmount: null,
        receiptQuantity: input.receivedQuantity,
        receiptLineId: input.receiptLineId,
      };
    }
    if (inspection === INSPECTION_STATUSES.FAILED) {
      return {
        withinTolerance: false,
        varianceType: MATCH_VARIANCE_TYPES.INSPECTION_FAILED,
        varianceAmount: null,
        receiptQuantity: input.receivedQuantity,
        receiptLineId: input.receiptLineId,
      };
    }
  }

  if (!withinPercentTolerance(invoiceQty, poQty, input.tolerances.quantityPercent)) {
    return {
      withinTolerance: false,
      varianceType: MATCH_VARIANCE_TYPES.QUANTITY,
      varianceAmount: formatInvoiceAmount(Math.abs(invoiceQty - poQty)),
      receiptQuantity: input.receivedQuantity,
      receiptLineId: input.receiptLineId,
    };
  }

  if (!withinPercentTolerance(invoiceAmount, poAmount, input.tolerances.pricePercent)) {
    return {
      withinTolerance: false,
      varianceType: MATCH_VARIANCE_TYPES.PRICE,
      varianceAmount: formatInvoiceAmount(Math.abs(invoiceAmount - poAmount)),
      receiptQuantity: input.receivedQuantity,
      receiptLineId: input.receiptLineId,
    };
  }

  const invoiceTax = parseInvoiceAmount(input.invoiceLine.lineTax);
  if (
    invoiceTax > 0 &&
    !withinAmountTolerance(invoiceTax, 0, input.tolerances.taxAmount) &&
    !withinPercentTolerance(invoiceTax, poAmount * 0, input.tolerances.pricePercent)
  ) {
    return {
      withinTolerance: false,
      varianceType: MATCH_VARIANCE_TYPES.TAX,
      varianceAmount: formatInvoiceAmount(invoiceTax),
      receiptQuantity: input.receivedQuantity,
      receiptLineId: input.receiptLineId,
    };
  }

  return {
    withinTolerance: true,
    varianceType: null,
    varianceAmount: null,
    receiptQuantity: input.receivedQuantity,
    receiptLineId: input.receiptLineId,
  };
}

export function aggregateMatchOutcome(
  lineResults: Array<{ withinTolerance: boolean; varianceType: string | null }>
) {
  if (lineResults.length === 0) {
    return MATCH_OUTCOMES.UNMATCHED;
  }
  if (lineResults.every((row) => row.withinTolerance)) {
    return MATCH_OUTCOMES.MATCHED;
  }
  if (lineResults.some((row) => row.varianceType === MATCH_VARIANCE_TYPES.RECEIPT_MISSING)) {
    return MATCH_OUTCOMES.UNMATCHED;
  }
  return MATCH_OUTCOMES.VARIANCE;
}

export function statusForMatchOutcome(outcome: string) {
  switch (outcome) {
    case MATCH_OUTCOMES.MATCHED:
      return INVOICE_STATUSES.PENDING_APPROVAL;
    case MATCH_OUTCOMES.DUPLICATE:
      return INVOICE_STATUSES.DUPLICATE;
    case MATCH_OUTCOMES.UNMATCHED:
      return INVOICE_STATUSES.UNMATCHED;
    default:
      return INVOICE_STATUSES.VARIANCE;
  }
}

export function duplicateBlocksCapture(policy: string) {
  return policy === DUPLICATE_POLICIES.BLOCK;
}

export function assertInvoiceEditable(status: string) {
  if (status !== INVOICE_STATUSES.DRAFT) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVOICE_NOT_EDITABLE, undefined, 409);
  }
}

export function assertCanCapture(status: string) {
  if (status !== INVOICE_STATUSES.DRAFT) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.MATCH_NOT_ALLOWED, undefined, 409);
  }
}

export function assertCanApprove(status: string, matchOutcome: string | null) {
  if (status !== INVOICE_STATUSES.PENDING_APPROVAL || matchOutcome !== MATCH_OUTCOMES.MATCHED) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVOICE_NOT_APPROVABLE, undefined, 409);
  }
}
