/**
 * Purpose:
 * Pure BP-006 IP-04 amendment, cancellation, and return-initiation rules.
 * Does not execute refunds or stock movement.
 *
 * Implementation Package:
 * BP-006 / IP-04 – Amendments, Cancellation & Returns
 */

import {
  SALES_CANCELLATION_REASON_CODES,
  SALES_DISPOSITION_POLICY,
  SALES_DISPOSITION_TYPES,
  SALES_INSTRUCTION_STATUS_CODES,
  SALES_ORDER_STATUS_CODES,
  SALES_RETURN_REASON_CODES,
} from "@/modules/sales/constants";
import { SalesOrderError, SALES_ERROR_CODES, SALES_USER_MESSAGES } from "@/modules/sales/errors";
import type { SalesDispositionPolicy } from "@/modules/sales/ports";
import { isCompletedStatus, parseQuantity } from "@/modules/sales/services/order-lifecycle-rules";
import { isDraftStatus } from "@/modules/sales/services/sales-order-rules";

export function dispositionPolicy(
  overrides?: Partial<SalesDispositionPolicy>
): SalesDispositionPolicy {
  return { ...SALES_DISPOSITION_POLICY, ...overrides };
}

export function cancelRequiresSod(status: string, policy: SalesDispositionPolicy): boolean {
  if (isDraftStatus(status) || status === SALES_ORDER_STATUS_CODES.SUBMITTED_FOR_CONFIRMATION) {
    return policy.draftCancelRequiresSod;
  }
  return policy.cancelRequiresSodAfterConfirm;
}

export function assertCancellableStatus(status: string): void {
  if (isCompletedStatus(status)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.COMPLETED_ORDER_NOT_CANCELLABLE,
      SALES_USER_MESSAGES.COMPLETED_ORDER_NOT_CANCELLABLE,
      409,
      { entity: "sale" }
    );
  }
}

export function assertCancellationReason(
  policy: SalesDispositionPolicy,
  reasonCode?: string | null
): string {
  if (!policy.cancelReasonRequired) {
    return reasonCode?.trim() || SALES_CANCELLATION_REASON_CODES.OTHER;
  }
  const code = reasonCode?.trim();
  if (!code || !(code in SALES_CANCELLATION_REASON_CODES)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.CANCELLATION_REASON_REQUIRED,
      SALES_USER_MESSAGES.CANCELLATION_REASON_REQUIRED,
      400,
      { field: "reasonCode", entity: "cancellation" }
    );
  }
  return code;
}

export function assertReturnReason(
  policy: SalesDispositionPolicy,
  reasonCode?: string | null
): string {
  if (!policy.returnReasonRequired) {
    return reasonCode?.trim() || SALES_RETURN_REASON_CODES.OTHER;
  }
  const code = reasonCode?.trim();
  if (!code || !(code in SALES_RETURN_REASON_CODES)) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.RETURN_REASON_REQUIRED,
      SALES_USER_MESSAGES.RETURN_REASON_REQUIRED,
      400,
      { field: "reasonCode", entity: "return" }
    );
  }
  return code;
}

export function isLineDispositionType(type: string): boolean {
  return (
    type === SALES_DISPOSITION_TYPES.RETURN_REPLACE ||
    type === SALES_DISPOSITION_TYPES.RETURN_CREDIT ||
    type === SALES_DISPOSITION_TYPES.REPLACE ||
    type === SALES_DISPOSITION_TYPES.CANCEL_REMAINDER
  );
}

export function closesRejectedWithoutReplacement(type: string): boolean {
  return (
    type === SALES_DISPOSITION_TYPES.RETURN_CREDIT ||
    type === SALES_DISPOSITION_TYPES.CANCEL_REMAINDER
  );
}

export function keepsRejectedInOutstanding(type: string): boolean {
  return (
    type === SALES_DISPOSITION_TYPES.RETURN_REPLACE ||
    type === SALES_DISPOSITION_TYPES.REPLACE
  );
}

export function emitsStockInstruction(type: string): boolean {
  return (
    type === SALES_DISPOSITION_TYPES.RETURN_REPLACE ||
    type === SALES_DISPOSITION_TYPES.RETURN_CREDIT ||
    type === SALES_DISPOSITION_TYPES.REPLACE
  );
}

export function assertDispositionQuantity(input: {
  requested: number;
  remainingOpenRejected: number;
}): number {
  const qty = parseQuantity(input.requested);
  if (qty <= 0 || qty > input.remainingOpenRejected) {
    throw new SalesOrderError(
      SALES_ERROR_CODES.DISPOSITION_QUANTITY_INVALID,
      SALES_USER_MESSAGES.DISPOSITION_QUANTITY_INVALID,
      409,
      { field: "quantity", entity: "return" }
    );
  }
  return qty;
}

export function instructionStatusLabel(status: string): string {
  switch (status) {
    case SALES_INSTRUCTION_STATUS_CODES.PROPOSED:
      return "Waiting for approval";
    case SALES_INSTRUCTION_STATUS_CODES.APPROVED:
      return "Approved";
    case SALES_INSTRUCTION_STATUS_CODES.REJECTED:
      return "Sent back";
    default:
      return status;
  }
}

export function dispositionTypeLabel(type: string): string {
  switch (type) {
    case SALES_DISPOSITION_TYPES.CANCEL:
      return "Cancel sale";
    case SALES_DISPOSITION_TYPES.RETURN_REPLACE:
      return "Return and replace";
    case SALES_DISPOSITION_TYPES.RETURN_CREDIT:
      return "Return and credit";
    case SALES_DISPOSITION_TYPES.REPLACE:
      return "Replace";
    case SALES_DISPOSITION_TYPES.CANCEL_REMAINDER:
      return "Cancel remainder";
    default:
      return type;
  }
}

export function amendmentStatusLabel(status: string): string {
  return instructionStatusLabel(status);
}
