/**
 * Purpose:
 * Pure receipt eligibility rules. Receipt amount is the successful
 * payment amount. Does not allocate, invoice, or recalculate commercials.
 *
 * Implementation Package:
 * BP-007 / IP-05 – Receipting & Payment Evidence
 */

import { PAYMENT_STATUS_CODES } from "@/modules/payments/constants";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentTransactionRecord } from "@/modules/payments/types";

export function assertReceiptEligible(transaction: PaymentTransactionRecord): void {
  if (transaction.status !== PAYMENT_STATUS_CODES.SUCCESSFUL) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.RECEIPT_NOT_ELIGIBLE,
      undefined,
      409
    );
  }
}

export function receiptAmountFromTransaction(transaction: PaymentTransactionRecord): string {
  return transaction.amount;
}

export function receiptPaymentDate(transaction: PaymentTransactionRecord): Date {
  return transaction.completedAt ?? transaction.initiatedAt ?? transaction.createdAt;
}
