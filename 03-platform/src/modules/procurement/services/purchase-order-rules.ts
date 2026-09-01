/**
 * Purpose:
 * Pure rules for BP-009 IP-06 purchase orders: lifecycle, lines, totals.
 */

import {
  PO_STATUSES,
  PO_STATUS_LABELS,
  PO_VERSION_STATUSES,
  PROCUREMENT_PERMISSIONS,
  PURCHASE_REQUEST_ORIGIN_TYPES,
  PURCHASE_REQUEST_STATUSES,
  type PoStatus,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { ProcurementActor, PoLineDraft } from "@/modules/procurement/types";
import { assertPermission } from "@/modules/procurement/services/procurement-rules";
import { computeLineTotal } from "@/modules/procurement/services/sourcing-response-rules";

export function assertPoRead(actor: ProcurementActor) {
  assertPermission(actor, PROCUREMENT_PERMISSIONS.PO_READ);
}

export function isPoStatus(value: string): value is PoStatus {
  return Object.values(PO_STATUSES).includes(value as PoStatus);
}

const EDITABLE_PO_STATUSES: PoStatus[] = [PO_STATUSES.DRAFT];

const SUBMITTABLE_PO_STATUSES: PoStatus[] = [PO_STATUSES.DRAFT];

const APPROVABLE_PO_STATUSES: PoStatus[] = [PO_STATUSES.PENDING_APPROVAL];

const ISSUABLE_PO_STATUSES: PoStatus[] = [PO_STATUSES.APPROVED];

const SUPPLIER_RESPONDABLE_STATUSES: PoStatus[] = [PO_STATUSES.ISSUED];

const AMENDABLE_PO_STATUSES: PoStatus[] = [
  PO_STATUSES.ISSUED,
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.CHANGE_REQUESTED,
  PO_STATUSES.REJECTED,
];

const CANCELLABLE_PO_STATUSES: PoStatus[] = [
  PO_STATUSES.DRAFT,
  PO_STATUSES.PENDING_APPROVAL,
  PO_STATUSES.APPROVED,
  PO_STATUSES.ISSUED,
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.CHANGE_REQUESTED,
  PO_STATUSES.REJECTED,
];

const CLOSABLE_PO_STATUSES: PoStatus[] = [
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.PARTIALLY_FULFILLED,
  PO_STATUSES.FULFILLED,
];

const FULFILMENT_PO_STATUSES: PoStatus[] = [
  PO_STATUSES.ACCEPTED,
  PO_STATUSES.PARTIALLY_FULFILLED,
];

export function assertEditablePo(status: string) {
  if (!EDITABLE_PO_STATUSES.includes(status as PoStatus)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_NOT_EDITABLE, undefined, 409);
  }
}

export function assertCanSubmitPo(status: string) {
  if (!SUBMITTABLE_PO_STATUSES.includes(status as PoStatus)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION, undefined, 409);
  }
}

export function assertCanApprovePo(status: string) {
  if (!APPROVABLE_PO_STATUSES.includes(status as PoStatus)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION, undefined, 409);
  }
}

export function assertCanIssuePo(status: string) {
  if (!ISSUABLE_PO_STATUSES.includes(status as PoStatus)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION, undefined, 409);
  }
}

export function assertSupplierRespondable(status: string) {
  if (!SUPPLIER_RESPONDABLE_STATUSES.includes(status as PoStatus)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION, undefined, 409);
  }
}

export function assertCanAmendPo(status: string) {
  if (!AMENDABLE_PO_STATUSES.includes(status as PoStatus)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.PO_NOT_EDITABLE, undefined, 409);
  }
}

export function assertCanCancelPo(status: string) {
  if (!CANCELLABLE_PO_STATUSES.includes(status as PoStatus)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION, undefined, 409);
  }
}

export function assertCanClosePo(status: string) {
  if (!CLOSABLE_PO_STATUSES.includes(status as PoStatus)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION, undefined, 409);
  }
}

export function assertCanRecordFulfilment(status: string) {
  if (!FULFILMENT_PO_STATUSES.includes(status as PoStatus)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_STATUS_TRANSITION, undefined, 409);
  }
}

export function assertApprovedPurchaseRequest(status: string, originType: string) {
  if (status !== PURCHASE_REQUEST_STATUSES.APPROVED) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.REQUEST_NOT_APPROVED, undefined, 409);
  }
  if (originType === PURCHASE_REQUEST_ORIGIN_TYPES.INVENTORY_REORDER) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_ORIGIN, undefined, 409);
  }
}

export function assertSkipRfxAllowed(
  skipRfxEnabled: boolean,
  skipRfxMaxAmount: string | null,
  estimatedValue: string
) {
  if (!skipRfxEnabled) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.SKIP_RFX_NOT_ALLOWED, undefined, 409);
  }
  if (skipRfxMaxAmount?.trim()) {
    const max = Number(skipRfxMaxAmount);
    const value = Number(estimatedValue);
    if (Number.isFinite(max) && Number.isFinite(value) && value > max) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.SKIP_RFX_NOT_ALLOWED, undefined, 409);
    }
  }
}

export function validatePoLines(lines: PoLineDraft[]): Array<{
  sequence: number;
  description: string;
  quantity: string;
  uom: string;
  unitPrice: string;
  taxRate: string;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
  awardLineId?: string | null;
  quoteLineId?: string | null;
  purchaseRequestLineId?: string | null;
  catalogueItemId?: string | null;
  promisedDeliveryDate?: string | null;
  deliveryLocation?: string | null;
  comments?: string | null;
  lineType?: string | null;
}> {
  if (lines.length === 0) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "lines",
    });
  }
  return lines.map((line, index) => {
    const description = line.description?.trim() ?? "";
    if (!description) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: `lines.${index}.description`,
      });
    }
    const quantity = line.quantity?.trim() ?? "";
    const unitPrice = line.unitPrice?.trim() ?? "";
    const qtyNum = Number(quantity);
    const priceNum = Number(unitPrice);
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_QUANTITY, undefined, 400, {
        field: `lines.${index}.quantity`,
      });
    }
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_INPUT, undefined, 400, {
        field: `lines.${index}.unitPrice`,
      });
    }
    const taxRate = line.taxRate?.trim() || "0";
    const lineTotal = computeLineTotal(quantity, unitPrice, taxRate);
    const subtotal = (qtyNum * priceNum).toFixed(2);
    const tax = (Number(subtotal) * (Number(taxRate) / 100)).toFixed(2);
    return {
      sequence: index + 1,
      description,
      quantity,
      uom: line.uom?.trim() || "EA",
      unitPrice,
      taxRate,
      lineSubtotal: subtotal,
      lineTax: tax,
      lineTotal,
      awardLineId: line.awardLineId ?? null,
      quoteLineId: line.quoteLineId ?? null,
      purchaseRequestLineId: line.purchaseRequestLineId ?? null,
      catalogueItemId: line.catalogueItemId ?? null,
      promisedDeliveryDate: line.promisedDeliveryDate ?? null,
      deliveryLocation: line.deliveryLocation ?? null,
      comments: line.comments ?? null,
      lineType: line.lineType?.trim().toUpperCase() || "INVENTORY",
    };
  });
}

export function sumPoLineTotals(
  lines: Array<{ lineSubtotal: string; lineTax: string; lineTotal: string }>
) {
  const subtotal = lines.reduce((sum, row) => sum + Number(row.lineSubtotal), 0);
  const tax = lines.reduce((sum, row) => sum + Number(row.lineTax), 0);
  const total = lines.reduce((sum, row) => sum + Number(row.lineTotal), 0);
  return {
    subtotalAmount: subtotal.toFixed(2),
    taxAmount: tax.toFixed(2),
    totalAmount: total.toFixed(2),
  };
}

export function isMaterialAmendment(
  previousTotal: string,
  nextTotal: string,
  threshold: string | null
): boolean {
  if (!threshold?.trim()) {
    return false;
  }
  const limit = Number(threshold);
  const prev = Number(previousTotal);
  const next = Number(nextTotal);
  if (!Number.isFinite(limit) || !Number.isFinite(prev) || !Number.isFinite(next)) {
    return false;
  }
  return Math.abs(next - prev) > limit;
}

export function poStatusLabel(status: string) {
  return PO_STATUS_LABELS[status as keyof typeof PO_STATUS_LABELS] ?? status;
}

export function versionStatusForIssue() {
  return PO_VERSION_STATUSES.ISSUED;
}

export function versionStatusForSupersede() {
  return PO_VERSION_STATUSES.SUPERSEDED;
}
