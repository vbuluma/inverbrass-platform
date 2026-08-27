/**
 * Purpose:
 * Payment-exception lifecycle and retry-safety rules. Does not mutate
 * payment, obligation, or commercial amounts.
 *
 * Implementation Package:
 * BP-007 / IP-08 – Payment Exceptions, Operations & Controls
 */

import { comparePaymentAmount } from "@/core/payment-engine";
import {
  PAYMENT_EXCEPTION_RESOLUTION_CODES,
  PAYMENT_EXCEPTION_STATUSES,
  PAYMENT_EXCEPTION_TYPES,
  PAYMENT_STATUS_CODES,
} from "@/modules/payments/constants";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentExceptionRecord, PaymentTransactionRecord } from "@/modules/payments/types";

const EXCEPTION_TRANSITIONS: Record<string, string[]> = {
  [PAYMENT_EXCEPTION_STATUSES.OPEN]: [
    PAYMENT_EXCEPTION_STATUSES.INVESTIGATING,
    PAYMENT_EXCEPTION_STATUSES.RESOLVED,
    PAYMENT_EXCEPTION_STATUSES.CLOSED,
  ],
  [PAYMENT_EXCEPTION_STATUSES.INVESTIGATING]: [
    PAYMENT_EXCEPTION_STATUSES.RESOLVED,
    PAYMENT_EXCEPTION_STATUSES.REJECTED,
    PAYMENT_EXCEPTION_STATUSES.CLOSED,
  ],
  [PAYMENT_EXCEPTION_STATUSES.REJECTED]: [
    PAYMENT_EXCEPTION_STATUSES.OPEN,
    PAYMENT_EXCEPTION_STATUSES.INVESTIGATING,
    PAYMENT_EXCEPTION_STATUSES.CLOSED,
  ],
  [PAYMENT_EXCEPTION_STATUSES.RESOLVED]: [PAYMENT_EXCEPTION_STATUSES.CLOSED],
  [PAYMENT_EXCEPTION_STATUSES.CLOSED]: [],
};

export function assertExceptionTransition(from: string, to: string): void {
  if (from === to) {
    return;
  }
  const allowed = EXCEPTION_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.EXCEPTION_INVALID_TRANSITION,
      undefined,
      409
    );
  }
}

export function isOpenExceptionStatus(status: string): boolean {
  return (
    status === PAYMENT_EXCEPTION_STATUSES.OPEN ||
    status === PAYMENT_EXCEPTION_STATUSES.INVESTIGATING ||
    status === PAYMENT_EXCEPTION_STATUSES.REJECTED
  );
}

export function lastNormalizedOutcome(
  transaction: PaymentTransactionRecord
): string | null {
  const metadata = transaction.providerResponseMetadata;
  const value = metadata?.lastNormalizedOutcome;
  return typeof value === "string" ? value : null;
}

export function isUnknownPayment(transaction: PaymentTransactionRecord): boolean {
  return (
    transaction.status === PAYMENT_STATUS_CODES.UNKNOWN ||
    lastNormalizedOutcome(transaction) === "UNKNOWN"
  );
}

export function isPendingOperational(transaction: PaymentTransactionRecord): boolean {
  return (
    transaction.status === PAYMENT_STATUS_CODES.PENDING ||
    transaction.status === PAYMENT_STATUS_CODES.INITIATED
  );
}

export function mismatchExceptionType(
  transaction: PaymentTransactionRecord
): string | null {
  if (!transaction.outcomeMismatch) {
    return null;
  }
  const metadata = transaction.providerResponseMetadata ?? {};
  const amount = typeof metadata.lastNormalizedAmount === "string"
    ? metadata.lastNormalizedAmount
    : null;
  const currency = typeof metadata.lastNormalizedCurrency === "string"
    ? metadata.lastNormalizedCurrency
    : null;
  const obligationId = typeof metadata.lastNormalizedObligationId === "string"
    ? metadata.lastNormalizedObligationId
    : null;
  if (obligationId && obligationId !== transaction.obligationId) {
    return PAYMENT_EXCEPTION_TYPES.CALLBACK_OBLIGATION_MISMATCH;
  }
  if (
    currency &&
    currency.trim().toUpperCase() !== transaction.currencyCode.trim().toUpperCase()
  ) {
    return PAYMENT_EXCEPTION_TYPES.CALLBACK_CURRENCY_MISMATCH;
  }
  if (amount && comparePaymentAmount(amount, transaction.amount) !== 0) {
    return PAYMENT_EXCEPTION_TYPES.CALLBACK_AMOUNT_MISMATCH;
  }
  return PAYMENT_EXCEPTION_TYPES.PROVIDER_RESPONSE_CONFLICT;
}

export function severityForType(exceptionType: string): string {
  if (
    exceptionType === PAYMENT_EXCEPTION_TYPES.PAYMENT_UNKNOWN ||
    exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_AMOUNT_MISMATCH ||
    exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_CURRENCY_MISMATCH ||
    exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_OBLIGATION_MISMATCH ||
    exceptionType === PAYMENT_EXCEPTION_TYPES.DUPLICATE_PROVIDER_REFERENCE ||
    exceptionType === PAYMENT_EXCEPTION_TYPES.PROVIDER_RESPONSE_CONFLICT
  ) {
    return "HIGH";
  }
  if (
    exceptionType === PAYMENT_EXCEPTION_TYPES.PAYMENT_TIMEOUT ||
    exceptionType === PAYMENT_EXCEPTION_TYPES.SETTLEMENT_VARIANCE
  ) {
    return "MEDIUM";
  }
  return "LOW";
}

export function reasonForType(exceptionType: string): string {
  if (exceptionType === PAYMENT_EXCEPTION_TYPES.PAYMENT_UNKNOWN) {
    return "Payment confirmation is not available yet.";
  }
  if (exceptionType === PAYMENT_EXCEPTION_TYPES.PAYMENT_TIMEOUT) {
    return "No confirmation was received within the expected time.";
  }
  if (exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_AMOUNT_MISMATCH) {
    return "The confirmed amount does not match this payment.";
  }
  if (exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_CURRENCY_MISMATCH) {
    return "The confirmed currency does not match this payment.";
  }
  if (exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_OBLIGATION_MISMATCH) {
    return "The confirmation does not belong to this payment.";
  }
  if (exceptionType === PAYMENT_EXCEPTION_TYPES.DUPLICATE_PROVIDER_REFERENCE) {
    return "The same provider reference was received for more than one payment.";
  }
  if (exceptionType === PAYMENT_EXCEPTION_TYPES.SETTLEMENT_VARIANCE) {
    return "The settled amount differs from the expected settlement.";
  }
  return "This payment needs review.";
}

export function paymentOutcomeForResolution(resolutionCode: string): string | null {
  if (resolutionCode === PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_SUCCESS) {
    return "SUCCESSFUL";
  }
  if (resolutionCode === PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_FAILURE) {
    return "FAILED";
  }
  if (resolutionCode === PAYMENT_EXCEPTION_RESOLUTION_CODES.EXPIRED) {
    return "EXPIRED";
  }
  if (
    resolutionCode === PAYMENT_EXCEPTION_RESOLUTION_CODES.PROVIDER_CONFIRMED_NOT_ACCEPTED
  ) {
    return "FAILED";
  }
  return null;
}

export function sensitiveResolution(resolutionCode: string): boolean {
  return resolutionCode === PAYMENT_EXCEPTION_RESOLUTION_CODES.CONFIRMED_SUCCESS;
}

export function retryBlockedReason(
  transaction: PaymentTransactionRecord,
  openExceptions: PaymentExceptionRecord[]
): string | null {
  if (transaction.status === PAYMENT_STATUS_CODES.SUCCESSFUL) {
    return "This payment is already confirmed.";
  }
  if (transaction.status === PAYMENT_STATUS_CODES.PENDING) {
    return "This payment is still being processed.";
  }
  if (isUnknownPayment(transaction)) {
    return "Payment confirmation is not available yet. Do not send another payment.";
  }
  if (transaction.outcomeMismatch) {
    return "The confirmation does not match this payment.";
  }
  if (
    openExceptions.some(
      (row) =>
        isOpenExceptionStatus(row.status) &&
        (row.exceptionType === PAYMENT_EXCEPTION_TYPES.PAYMENT_UNKNOWN ||
          row.exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_AMOUNT_MISMATCH ||
          row.exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_CURRENCY_MISMATCH ||
          row.exceptionType === PAYMENT_EXCEPTION_TYPES.CALLBACK_OBLIGATION_MISMATCH ||
          row.exceptionType === PAYMENT_EXCEPTION_TYPES.PROVIDER_RESPONSE_CONFLICT)
    )
  ) {
    return "This payment still needs review.";
  }
  return null;
}
