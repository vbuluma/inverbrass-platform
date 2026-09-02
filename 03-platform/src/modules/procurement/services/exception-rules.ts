/**
 * Purpose:
 * Pure BP-009 IP-10 exception rules.
 * Does not post inventory, GL, or execute payment.
 */

import {
  DISCREPANCY_TYPES,
  EXCEPTION_OBJECT_TYPES,
  EXCEPTION_RAISED_FROM,
  EXCEPTION_SEVERITIES,
  EXCEPTION_STATUSES,
  EXCEPTION_TYPE_CODES,
  HIGH_EXCEPTION_SEVERITIES,
  MATCH_OUTCOMES,
  MATCH_VARIANCE_TYPES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type { ExceptionControlRecord, ExceptionLinkInput, ExceptionTypeRecord } from "@/modules/procurement/types";

const TERMINAL_STATUSES = new Set<string>([
  EXCEPTION_STATUSES.CLOSED,
  EXCEPTION_STATUSES.CANCELLED,
]);

export function exceptionStatusLabel(status: string) {
  switch (status) {
    case EXCEPTION_STATUSES.OPEN:
      return "Open";
    case EXCEPTION_STATUSES.ASSIGNED:
      return "Assigned";
    case EXCEPTION_STATUSES.IN_PROGRESS:
      return "In progress";
    case EXCEPTION_STATUSES.RESOLVED_PENDING_APPROVAL:
      return "Pending approval";
    case EXCEPTION_STATUSES.CLOSED:
      return "Closed";
    case EXCEPTION_STATUSES.CANCELLED:
      return "Cancelled";
    default:
      return status.replaceAll("_", " ");
  }
}

export function assertExceptionLinks(links: ExceptionLinkInput[]) {
  if (links.length === 0) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.EXCEPTION_LINK_REQUIRED, undefined, 400);
  }
}

export function assertExceptionEditable(status: string) {
  if (TERMINAL_STATUSES.has(status)) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.EXCEPTION_NOT_EDITABLE, undefined, 409);
  }
}

export function resolveExceptionType(
  types: ExceptionTypeRecord[],
  code: string
): ExceptionTypeRecord {
  const row = types.find((item) => item.code === code && item.isActive);
  if (!row) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.EXCEPTION_INVALID_TYPE, undefined, 400, {
      field: "exceptionTypeCode",
    });
  }
  return row;
}

export function requiresApprovalToClose(input: {
  control: ExceptionControlRecord;
  type: ExceptionTypeRecord;
  severity: string;
}) {
  if (input.type.requiresApprovalOnClose) {
    return true;
  }
  if (
    input.control.highSeverityRequiresApproval &&
    HIGH_EXCEPTION_SEVERITIES.includes(input.severity as (typeof HIGH_EXCEPTION_SEVERITIES)[number])
  ) {
    return true;
  }
  return false;
}

export function assertDuplicateInvoiceDecision(input: {
  control: ExceptionControlRecord;
  exceptionTypeCode: string;
  resolutionDecision?: string | null;
}) {
  if (
    input.control.duplicateInvoiceRequiresDecision &&
    input.exceptionTypeCode === EXCEPTION_TYPE_CODES.DUPLICATE_INVOICE &&
    !input.resolutionDecision?.trim()
  ) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.EXCEPTION_DECISION_REQUIRED, undefined, 400, {
      field: "resolutionDecision",
    });
  }
}

export function mapMatchOutcomeToExceptionType(outcome: string, varianceType?: string | null) {
  if (outcome === MATCH_OUTCOMES.DUPLICATE) {
    return EXCEPTION_TYPE_CODES.DUPLICATE_INVOICE;
  }
  switch (varianceType) {
    case MATCH_VARIANCE_TYPES.PRICE:
      return EXCEPTION_TYPE_CODES.PRICE_VARIANCE;
    case MATCH_VARIANCE_TYPES.QUANTITY:
      return EXCEPTION_TYPE_CODES.QUANTITY_VARIANCE;
    case MATCH_VARIANCE_TYPES.RECEIPT_MISSING:
      return EXCEPTION_TYPE_CODES.MISSING_RECEIPT;
    case MATCH_VARIANCE_TYPES.INSPECTION_FAILED:
      return EXCEPTION_TYPE_CODES.QUALITY_FAILURE;
    default:
      return outcome === MATCH_OUTCOMES.UNMATCHED
        ? EXCEPTION_TYPE_CODES.INVOICE_MISMATCH
        : EXCEPTION_TYPE_CODES.INVOICE_MISMATCH;
  }
}

export function mapDiscrepancyToExceptionType(discrepancyType: string) {
  switch (discrepancyType) {
    case DISCREPANCY_TYPES.SHORT_DELIVERY:
      return EXCEPTION_TYPE_CODES.UNDER_DELIVERY;
    case DISCREPANCY_TYPES.OVER_DELIVERY:
      return EXCEPTION_TYPE_CODES.OVER_DELIVERY;
    case DISCREPANCY_TYPES.DAMAGED:
      return EXCEPTION_TYPE_CODES.DAMAGED_GOODS;
    default:
      return EXCEPTION_TYPE_CODES.PARTIAL_DELIVERY;
  }
}

export function defaultSeverityForType(type: ExceptionTypeRecord, override?: string | null) {
  return override?.trim() || type.defaultSeverity || EXCEPTION_SEVERITIES.MEDIUM;
}

export function buildExceptionLinkHref(objectType: string, objectId: string) {
  switch (objectType) {
    case EXCEPTION_OBJECT_TYPES.PURCHASE_REQUEST:
      return `/procurement/requests/${objectId}`;
    case EXCEPTION_OBJECT_TYPES.SOURCING_EVENT:
      return `/procurement/sourcing/${objectId}`;
    case EXCEPTION_OBJECT_TYPES.PURCHASE_ORDER:
      return `/procurement/orders/${objectId}`;
    case EXCEPTION_OBJECT_TYPES.CONTRACT:
      return `/procurement/contracts/${objectId}`;
    case EXCEPTION_OBJECT_TYPES.RECEIPT:
      return `/procurement/receiving/${objectId}`;
    case EXCEPTION_OBJECT_TYPES.INVOICE:
      return `/procurement/invoices/${objectId}`;
    case EXCEPTION_OBJECT_TYPES.PROFILE:
      return `/procurement/suppliers/${objectId}`;
    default:
      return `/procurement/exceptions`;
  }
}

export function buildExceptionLinkLabel(objectType: string, objectId: string) {
  const shortId = objectId.slice(0, 8);
  switch (objectType) {
    case EXCEPTION_OBJECT_TYPES.PURCHASE_ORDER:
      return `PO ${shortId}`;
    case EXCEPTION_OBJECT_TYPES.INVOICE:
      return `Invoice ${shortId}`;
    case EXCEPTION_OBJECT_TYPES.RECEIPT:
      return `Receipt ${shortId}`;
    case EXCEPTION_OBJECT_TYPES.CONTRACT:
      return `Contract ${shortId}`;
    default:
      return `${objectType.replaceAll("_", " ")} ${shortId}`;
  }
}

export function isExceptionOverdue(dueAt: Date | null, status: string, today = new Date()) {
  if (!dueAt || TERMINAL_STATUSES.has(status)) {
    return false;
  }
  return dueAt.getTime() < today.getTime();
}

export function systemRaisedFrom(source: string) {
  return source === EXCEPTION_RAISED_FROM.SYSTEM_RECEIPT
    ? EXCEPTION_RAISED_FROM.SYSTEM_RECEIPT
    : EXCEPTION_RAISED_FROM.SYSTEM_MATCH;
}
