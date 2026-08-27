/**
 * Purpose:
 * Pure refund eligibility and refundable-amount rules. Does not
 * recalculate commercial totals or tax.
 *
 * Implementation Package:
 * BP-007 / IP-06 – Refunds, Reversals & Adjustments
 */

import {
  addPaymentAmounts,
  comparePaymentAmount,
  isPositivePaymentAmount,
  subtractPaymentAmounts,
} from "@/core/payment-engine";
import {
  PAYMENT_STATUS_CODES,
  REFUND_IN_FLIGHT_STATUSES,
  REFUND_STATUS,
  REFUND_TYPES,
} from "@/modules/payments/constants";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentRefundRecord, PaymentTransactionRecord } from "@/modules/payments/types";

const REFUND_TRANSITIONS: Record<string, string[]> = {
  [REFUND_STATUS.REQUESTED]: [
    REFUND_STATUS.APPROVAL_PENDING,
    REFUND_STATUS.APPROVED,
    REFUND_STATUS.REJECTED,
  ],
  [REFUND_STATUS.APPROVAL_PENDING]: [REFUND_STATUS.APPROVED, REFUND_STATUS.REJECTED],
  [REFUND_STATUS.APPROVED]: [REFUND_STATUS.INITIATED],
  [REFUND_STATUS.INITIATED]: [
    REFUND_STATUS.PENDING,
    REFUND_STATUS.SUCCESSFUL,
    REFUND_STATUS.FAILED,
    REFUND_STATUS.UNKNOWN,
  ],
  [REFUND_STATUS.PENDING]: [
    REFUND_STATUS.SUCCESSFUL,
    REFUND_STATUS.FAILED,
    REFUND_STATUS.UNKNOWN,
  ],
  [REFUND_STATUS.SUCCESSFUL]: [],
  [REFUND_STATUS.FAILED]: [],
  [REFUND_STATUS.UNKNOWN]: [],
  [REFUND_STATUS.REJECTED]: [],
};

export function assertRefundEligible(transaction: PaymentTransactionRecord): void {
  if (transaction.status !== PAYMENT_STATUS_CODES.SUCCESSFUL) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.NO_REFUNDABLE_PAYMENT,
      undefined,
      409
    );
  }
}

export function successfulRefundTotal(rows: PaymentRefundRecord[]): string {
  let total = "0";
  for (const row of rows) {
    if (row.status !== REFUND_STATUS.SUCCESSFUL) {
      continue;
    }
    total = addPaymentAmounts(total, row.amount);
  }
  return total;
}

export function reservedRefundTotal(rows: PaymentRefundRecord[]): string {
  let total = "0";
  for (const row of rows) {
    if (!REFUND_IN_FLIGHT_STATUSES.has(row.status)) {
      continue;
    }
    total = addPaymentAmounts(total, row.amount);
  }
  return total;
}

export function displayedRefundableAmount(
  originalAmount: string,
  rows: PaymentRefundRecord[]
): string {
  const remaining = subtractPaymentAmounts(originalAmount, successfulRefundTotal(rows));
  return comparePaymentAmount(remaining, "0") > 0 ? remaining : "0";
}

export function requestRefundableAmount(
  originalAmount: string,
  rows: PaymentRefundRecord[]
): string {
  const consumed = addPaymentAmounts(
    successfulRefundTotal(rows),
    reservedRefundTotal(rows)
  );
  const remaining = subtractPaymentAmounts(originalAmount, consumed);
  return comparePaymentAmount(remaining, "0") > 0 ? remaining : "0";
}

export function resolveRefundType(
  requestedType: string | null | undefined,
  amount: string,
  refundable: string
): string {
  const type = requestedType?.trim().toUpperCase() || "";
  if (type === REFUND_TYPES.REVERSAL) {
    return REFUND_TYPES.REVERSAL;
  }
  if (type === REFUND_TYPES.PARTIAL_REFUND) {
    return REFUND_TYPES.PARTIAL_REFUND;
  }
  if (type === REFUND_TYPES.FULL_REFUND) {
    return REFUND_TYPES.FULL_REFUND;
  }
  return comparePaymentAmount(amount, refundable) === 0
    ? REFUND_TYPES.FULL_REFUND
    : REFUND_TYPES.PARTIAL_REFUND;
}

export function assertRefundAmount(
  amount: string,
  currency: string,
  transaction: PaymentTransactionRecord,
  refundable: string
): void {
  if (!isPositivePaymentAmount(amount)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.PAYMENT_INVALID_AMOUNT,
      undefined,
      400,
      { field: "amount", entity: "refund" }
    );
  }
  if (currency.trim().toUpperCase() !== transaction.currencyCode.trim().toUpperCase()) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.REFUND_CURRENCY_MISMATCH,
      undefined,
      409
    );
  }
  if (!isPositivePaymentAmount(refundable)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.NO_REFUNDABLE_PAYMENT,
      undefined,
      409
    );
  }
  if (comparePaymentAmount(amount, refundable) > 0) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.REFUND_AMOUNT_EXCEEDS_REFUNDABLE,
      undefined,
      409
    );
  }
}

export function assertRefundTransition(from: string, to: string): void {
  const allowed = REFUND_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.REFUND_INVALID_TRANSITION,
      undefined,
      409
    );
  }
}

export const REFUND_INSTRUCTION_TYPES = new Set([
  "CANCEL",
  "RETURN",
  "CREDIT",
  "RETURN_CREDIT",
  "CANCEL_REMAINDER",
]);
