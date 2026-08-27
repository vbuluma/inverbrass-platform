/**
 * Purpose:
 * Pure settlement lifecycle and expected-vs-received variance rules.
 * Does not mutate payment, obligation, receipt, or allocation amounts.
 *
 * Implementation Package:
 * BP-007 / IP-07 – Settlement & Reconciliation Handoff
 */

import {
  comparePaymentAmount,
  subtractPaymentAmounts,
} from "@/core/payment-engine";
import type { NormalizedSettlementOutcome } from "@/core/payment-engine/types";
import {
  PAYMENT_STATUS_CODES,
  SETTLEMENT_STATUS,
  type SettlementStatus,
} from "@/modules/payments/constants";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type {
  PaymentSettlementRecord,
  PaymentTransactionRecord,
  SettlementMode,
} from "@/modules/payments/types";

const SETTLEMENT_TRANSITIONS: Record<string, string[]> = {
  [SETTLEMENT_STATUS.NOT_APPLICABLE]: [],
  [SETTLEMENT_STATUS.SETTLEMENT_PENDING]: [
    SETTLEMENT_STATUS.SETTLEMENT_RECEIVED,
    SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED,
    SETTLEMENT_STATUS.SETTLEMENT_EXCEPTION,
  ],
  [SETTLEMENT_STATUS.SETTLEMENT_RECEIVED]: [
    SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED,
    SETTLEMENT_STATUS.SETTLEMENT_EXCEPTION,
  ],
  [SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED]: [],
  [SETTLEMENT_STATUS.SETTLEMENT_EXCEPTION]: [],
};

export function assertSettlementEligible(transaction: PaymentTransactionRecord): void {
  if (transaction.status !== PAYMENT_STATUS_CODES.SUCCESSFUL) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.SETTLEMENT_NOT_ELIGIBLE,
      undefined,
      409
    );
  }
}

export function assertSettlementTransition(from: string, to: string): void {
  if (from === to) {
    return;
  }
  const allowed = SETTLEMENT_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.SETTLEMENT_INVALID_TRANSITION,
      undefined,
      409
    );
  }
}

export function initialStatusForMode(mode: SettlementMode): SettlementStatus {
  if (mode === "NOT_APPLICABLE") {
    return SETTLEMENT_STATUS.NOT_APPLICABLE;
  }
  if (mode === "IMMEDIATE") {
    return SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED;
  }
  return SETTLEMENT_STATUS.SETTLEMENT_PENDING;
}

export function expectedSettlementFromPayment(
  transaction: PaymentTransactionRecord,
  engineExpected?: string | null
): string {
  const trimmed = engineExpected?.trim();
  if (trimmed) {
    return trimmed;
  }
  return transaction.amount;
}

export function settlementVariance(
  receivedAmount: string | null | undefined,
  expectedAmount: string
): string | null {
  if (!receivedAmount?.trim()) {
    return null;
  }
  return subtractPaymentAmounts(receivedAmount, expectedAmount);
}

export function hasSettlementVariance(
  receivedAmount: string | null | undefined,
  expectedAmount: string
): boolean {
  if (!receivedAmount?.trim()) {
    return false;
  }
  return comparePaymentAmount(receivedAmount, expectedAmount) !== 0;
}

export function mapEngineSettlementStatus(
  engineStatus: NormalizedSettlementOutcome["settlementStatus"],
  exceptionFlag: boolean
): SettlementStatus {
  if (engineStatus === "NOT_APPLICABLE") {
    return SETTLEMENT_STATUS.NOT_APPLICABLE;
  }
  if (engineStatus === "EXCEPTION") {
    return SETTLEMENT_STATUS.SETTLEMENT_EXCEPTION;
  }
  if (engineStatus === "CONFIRMED") {
    return SETTLEMENT_STATUS.SETTLEMENT_CONFIRMED;
  }
  if (engineStatus === "RECEIVED") {
    return SETTLEMENT_STATUS.SETTLEMENT_RECEIVED;
  }
  void exceptionFlag;
  return SETTLEMENT_STATUS.SETTLEMENT_PENDING;
}

export function settlementConflict(
  existing: PaymentSettlementRecord,
  incoming: {
    paymentTransactionId: string;
    currencyCode: string;
    receivedAmount?: string | null;
    settlementBatchReference?: string | null;
  }
): boolean {
  if (existing.paymentTransactionId !== incoming.paymentTransactionId) {
    return true;
  }
  if (
    existing.currencyCode.trim().toUpperCase() !== incoming.currencyCode.trim().toUpperCase()
  ) {
    return true;
  }
  if (
    incoming.settlementBatchReference?.trim() &&
    existing.settlementBatchReference?.trim() &&
    existing.settlementBatchReference.trim() !== incoming.settlementBatchReference.trim()
  ) {
    return true;
  }
  if (
    incoming.receivedAmount?.trim() &&
    existing.receivedAmount?.trim() &&
    comparePaymentAmount(existing.receivedAmount, incoming.receivedAmount) !== 0
  ) {
    return true;
  }
  return false;
}

export function sameSettlementNotification(
  existing: PaymentSettlementRecord,
  incoming: {
    paymentTransactionId: string;
    currencyCode: string;
    receivedAmount?: string | null;
    settlementBatchReference?: string | null;
    settlementReference?: string | null;
  }
): boolean {
  if (settlementConflict(existing, incoming)) {
    return false;
  }
  if (
    incoming.settlementReference?.trim() &&
    existing.settlementReference?.trim() &&
    existing.settlementReference.trim() !== incoming.settlementReference.trim()
  ) {
    return false;
  }
  return true;
}
