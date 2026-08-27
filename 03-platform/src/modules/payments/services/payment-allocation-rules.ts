/**
 * Purpose:
 * Pure allocation math. Paid is the sum of active allocations, not the
 * payment-transaction amount. Does not recalculate commercial totals.
 *
 * Implementation Package:
 * BP-007 / IP-03 – Partial, Split Payment & Allocation
 */

import {
  addPaymentAmounts,
  comparePaymentAmount,
  isPositivePaymentAmount,
  parsePaymentAmount,
  subtractPaymentAmounts,
} from "@/core/payment-engine";
import { PAYMENT_ALLOCATION_STATUS } from "@/modules/payments/constants";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { PaymentAllocationRecord } from "@/modules/payments/types";

export function isActiveAllocation(row: Pick<PaymentAllocationRecord, "status">): boolean {
  return row.status === PAYMENT_ALLOCATION_STATUS.ALLOCATED;
}

export function sumAllocatedAmounts(rows: Array<Pick<PaymentAllocationRecord, "allocatedAmount" | "status">>): string {
  let total = "0";
  for (const row of rows) {
    if (!isActiveAllocation(row)) {
      continue;
    }
    total = addPaymentAmounts(total, row.allocatedAmount);
  }
  return total;
}

export function netAllocatedAmounts(
  rows: Array<Pick<PaymentAllocationRecord, "allocatedAmount" | "status">>
): string {
  let allocated = "0";
  let refunded = "0";
  for (const row of rows) {
    if (row.status === PAYMENT_ALLOCATION_STATUS.ALLOCATED) {
      allocated = addPaymentAmounts(allocated, row.allocatedAmount);
    }
    if (row.status === PAYMENT_ALLOCATION_STATUS.REFUND) {
      refunded = addPaymentAmounts(refunded, row.allocatedAmount);
    }
  }
  const remaining = subtractPaymentAmounts(allocated, refunded);
  const scaled = parsePaymentAmount(remaining);
  if (scaled === null || scaled < 0) {
    return "0";
  }
  return remaining;
}

export function unallocatedTransactionAmount(
  transactionAmount: string,
  allocatedFromTransaction: string
): string {
  const remaining = subtractPaymentAmounts(transactionAmount, allocatedFromTransaction);
  const scaled = parsePaymentAmount(remaining);
  if (scaled === null || scaled < 0) {
    return "0";
  }
  return remaining;
}

export function obligationOutstanding(amountDue: string, allocatedToObligation: string): string {
  const remaining = subtractPaymentAmounts(amountDue, allocatedToObligation);
  const scaled = parsePaymentAmount(remaining);
  if (scaled === null || scaled < 0) {
    return "0";
  }
  return remaining;
}

export function clampPaidToAmountDue(amountDue: string, allocatedToObligation: string): string {
  if (comparePaymentAmount(allocatedToObligation, amountDue) > 0) {
    return amountDue;
  }
  return allocatedToObligation;
}

export type AllocationPlan = {
  allocateAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  unallocatedAfter: string;
};

export function planAllocation(input: {
  amountDue: string;
  allocatedToObligation: string;
  transactionAmount: string;
  allocatedFromTransaction: string;
  requestedAmount: string | null;
  allowOverpayment: boolean;
}): AllocationPlan {
  const unallocated = unallocatedTransactionAmount(
    input.transactionAmount,
    input.allocatedFromTransaction
  );
  const remainingDue = obligationOutstanding(input.amountDue, input.allocatedToObligation);
  const requested = input.requestedAmount?.trim() || null;

  if (requested && !isPositivePaymentAmount(requested)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.PAYMENT_INVALID_AMOUNT,
      undefined,
      400,
      { field: "amount", entity: "payment" }
    );
  }

  if (requested && comparePaymentAmount(requested, unallocated) > 0) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.ALLOCATION_EXCEEDS_UNALLOCATED,
      undefined,
      409
    );
  }

  let allocateAmount = requested ?? (
    comparePaymentAmount(unallocated, remainingDue) > 0 ? remainingDue : unallocated
  );

  if (!isPositivePaymentAmount(allocateAmount)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.ALLOCATION_EXCEEDS_OBLIGATION,
      undefined,
      409
    );
  }

  if (comparePaymentAmount(allocateAmount, remainingDue) > 0) {
    if (!input.allowOverpayment) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_EXCEEDS_OBLIGATION,
        undefined,
        409
      );
    }
    allocateAmount = remainingDue;
    if (!isPositivePaymentAmount(allocateAmount)) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.ALLOCATION_EXCEEDS_OBLIGATION,
        undefined,
        409
      );
    }
  }

  const paidAmount = clampPaidToAmountDue(
    input.amountDue,
    addPaymentAmounts(input.allocatedToObligation, allocateAmount)
  );
  const outstandingAmount = obligationOutstanding(input.amountDue, paidAmount);
  const unallocatedAfter = unallocatedTransactionAmount(
    input.transactionAmount,
    addPaymentAmounts(input.allocatedFromTransaction, allocateAmount)
  );

  return {
    allocateAmount,
    paidAmount,
    outstandingAmount,
    unallocatedAfter,
  };
}
