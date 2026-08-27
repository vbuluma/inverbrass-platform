/**
 * Purpose:
 * Enforce payment-transaction lifecycle transitions. Refunds/reversals
 * are not valid here.
 *
 * Implementation Package:
 * BP-007 / IP-02 – Payment Initiation & Processing
 */

import type { NormalizedPaymentOutcomeKind } from "@/core/payment-engine/types";
import {
  PAYMENT_STATUS_CODES,
  type PaymentStatusCode,
} from "@/modules/payments/constants";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";

const ALLOWED_TRANSITIONS: Record<string, readonly string[]> = {
  [PAYMENT_STATUS_CODES.NOT_STARTED]: [
    PAYMENT_STATUS_CODES.INITIATED,
    PAYMENT_STATUS_CODES.PENDING,
    PAYMENT_STATUS_CODES.SUCCESSFUL,
    PAYMENT_STATUS_CODES.FAILED,
    PAYMENT_STATUS_CODES.EXPIRED,
    PAYMENT_STATUS_CODES.UNKNOWN,
  ],
  [PAYMENT_STATUS_CODES.INITIATED]: [
    PAYMENT_STATUS_CODES.PENDING,
    PAYMENT_STATUS_CODES.SUCCESSFUL,
    PAYMENT_STATUS_CODES.FAILED,
    PAYMENT_STATUS_CODES.EXPIRED,
    PAYMENT_STATUS_CODES.UNKNOWN,
  ],
  [PAYMENT_STATUS_CODES.PENDING]: [
    PAYMENT_STATUS_CODES.SUCCESSFUL,
    PAYMENT_STATUS_CODES.FAILED,
    PAYMENT_STATUS_CODES.EXPIRED,
    PAYMENT_STATUS_CODES.UNKNOWN,
  ],
  [PAYMENT_STATUS_CODES.UNKNOWN]: [
    PAYMENT_STATUS_CODES.SUCCESSFUL,
    PAYMENT_STATUS_CODES.FAILED,
    PAYMENT_STATUS_CODES.EXPIRED,
  ],
  [PAYMENT_STATUS_CODES.SUCCESSFUL]: [],
  [PAYMENT_STATUS_CODES.FAILED]: [],
  [PAYMENT_STATUS_CODES.EXPIRED]: [],
};

export function canTransitionPaymentStatus(from: string, to: string): boolean {
  if (from === to) {
    return true;
  }
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

export function assertPaymentStatusTransition(from: string, to: string): void {
  if (canTransitionPaymentStatus(from, to)) {
    return;
  }
  throw new PaymentObligationError(
    PAYMENT_ERROR_CODES.PAYMENT_INVALID_TRANSITION,
    undefined,
    409
  );
}

export function mapNormalizedOutcomeToStatus(
  outcome: NormalizedPaymentOutcomeKind | string
): PaymentStatusCode | null {
  switch (outcome) {
    case "ACCEPTED":
      return PAYMENT_STATUS_CODES.INITIATED;
    case "PENDING":
      return PAYMENT_STATUS_CODES.PENDING;
    case "SUCCESSFUL":
      return PAYMENT_STATUS_CODES.SUCCESSFUL;
    case "FAILED":
      return PAYMENT_STATUS_CODES.FAILED;
    case "EXPIRED":
      return PAYMENT_STATUS_CODES.EXPIRED;
    case "UNKNOWN":
      return PAYMENT_STATUS_CODES.UNKNOWN;
    case "NOT_ACCEPTED":
      return PAYMENT_STATUS_CODES.FAILED;
    default:
      return null;
  }
}

export function isTerminalPaymentStatus(status: string): boolean {
  return (
    status === PAYMENT_STATUS_CODES.SUCCESSFUL ||
    status === PAYMENT_STATUS_CODES.FAILED ||
    status === PAYMENT_STATUS_CODES.EXPIRED
  );
}
