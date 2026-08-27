/**
 * Purpose:
 * Pure invoice billing rules. Consumes obligation amounts and IP-03
 * allocation totals. Does not recalculate commercial price or tax.
 *
 * Implementation Package:
 * BP-007 / IP-04 – Billing, Invoicing & Credit Sales
 */

import {
  comparePaymentAmount,
  isPositivePaymentAmount,
  parsePaymentAmount,
  subtractPaymentAmounts,
} from "@/core/payment-engine";
import { INVOICE_STATUS } from "@/modules/payments/constants";
import { PAYMENT_ERROR_CODES, PaymentObligationError } from "@/modules/payments/errors";
import type { InvoicePaymentTermRecord, PaymentObligationRecord } from "@/modules/payments/types";

export const OPEN_INVOICE_STATUSES = new Set<string>([
  INVOICE_STATUS.DRAFT,
  INVOICE_STATUS.ISSUED,
  INVOICE_STATUS.PARTIALLY_PAID,
  INVOICE_STATUS.PAID,
  INVOICE_STATUS.OVERDUE,
]);

export function isActiveInvoiceStatus(status: string): boolean {
  return OPEN_INVOICE_STATUSES.has(status) && status !== INVOICE_STATUS.PAID;
}

export function billedAmountFromObligation(obligation: PaymentObligationRecord): string {
  if (isPositivePaymentAmount(obligation.outstandingAmount)) {
    return obligation.outstandingAmount;
  }
  return obligation.amountDue;
}

export function invoiceSettlement(input: {
  invoiceAmount: string;
  openingPaidAmount: string;
  obligationPaidAmount: string;
}): { paidAmount: string; outstandingAmount: string } {
  const appliedRaw = subtractPaymentAmounts(
    input.obligationPaidAmount,
    input.openingPaidAmount
  );
  const appliedScaled = parsePaymentAmount(appliedRaw);
  const applied = appliedScaled === null || appliedScaled < 0 ? "0" : appliedRaw;
  const paid =
    comparePaymentAmount(applied, input.invoiceAmount) > 0
      ? input.invoiceAmount
      : applied;
  const outstandingRaw = subtractPaymentAmounts(input.invoiceAmount, paid);
  const outstandingScaled = parsePaymentAmount(outstandingRaw);
  const outstanding =
    outstandingScaled === null || outstandingScaled < 0 ? "0" : outstandingRaw;
  return { paidAmount: paid, outstandingAmount: outstanding };
}

export function dueDateFromTerm(issueDate: Date, term: InvoicePaymentTermRecord): Date {
  const due = new Date(issueDate.getTime());
  due.setUTCDate(due.getUTCDate() + term.netDays);
  return due;
}

export function deriveOpenInvoiceStatus(input: {
  currentStatus: string;
  paidAmount: string;
  outstandingAmount: string;
  dueDate: Date | null;
  now: Date;
}): string {
  if (
    input.currentStatus === INVOICE_STATUS.CANCELLED ||
    input.currentStatus === INVOICE_STATUS.CREDITED ||
    input.currentStatus === INVOICE_STATUS.DRAFT
  ) {
    return input.currentStatus;
  }
  if (!isPositivePaymentAmount(input.outstandingAmount)) {
    return INVOICE_STATUS.PAID;
  }
  if (input.dueDate && input.now.getTime() > input.dueDate.getTime()) {
    return INVOICE_STATUS.OVERDUE;
  }
  if (isPositivePaymentAmount(input.paidAmount)) {
    return INVOICE_STATUS.PARTIALLY_PAID;
  }
  return INVOICE_STATUS.ISSUED;
}

export function assertCreditSalesAllowed(input: {
  billedAmount: string;
  creditSalesEnabled: boolean;
}): void {
  if (!isPositivePaymentAmount(input.billedAmount)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.PAYMENT_INVALID_AMOUNT,
      undefined,
      400,
      { field: "amount", entity: "invoice" }
    );
  }
  if (!input.creditSalesEnabled) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.CREDIT_SALES_DISABLED,
      undefined,
      409
    );
  }
}

export function assertInvoiceAmountFromObligation(
  billedAmount: string,
  obligation: PaymentObligationRecord
): void {
  const remaining = billedAmountFromObligation(obligation);
  if (comparePaymentAmount(billedAmount, remaining) !== 0) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.CONTRACT_TAMPERED,
      undefined,
      409
    );
  }
  if (comparePaymentAmount(billedAmount, obligation.amountDue) > 0) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.CONTRACT_TAMPERED,
      undefined,
      409
    );
  }
}
