/**
 * Purpose:
 * Fail-closed payment-ready contract validation.
 * Copies amount and currency — never recalculates from order lines.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

import { parsePaymentAmount } from "@/core/payment-engine/limit-rules";
import {
  PAYMENT_FINANCIAL_INSTRUCTION_TYPES,
  PAYMENT_INELIGIBLE_ORDER_STATUSES,
} from "@/modules/payments/constants";
import {
  PAYMENT_ERROR_CODES,
  PAYMENT_USER_MESSAGES,
  PaymentObligationError,
} from "@/modules/payments/errors";
import type { PaymentReadyContract } from "@/modules/payments/types";

function isBlank(value: string | null | undefined): boolean {
  return !value || !String(value).trim();
}

export function copiedAmountDueFromContract(contract: PaymentReadyContract): string {
  if (contract.expectedAmount === null || contract.expectedAmount === undefined) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.AMOUNT_DUE_MISSING,
      PAYMENT_USER_MESSAGES.AMOUNT_DUE_MISSING,
      409,
      { field: "expectedAmount", entity: "payment" }
    );
  }
  const trimmed = String(contract.expectedAmount).trim();
  if (!trimmed) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.AMOUNT_DUE_MISSING,
      PAYMENT_USER_MESSAGES.AMOUNT_DUE_MISSING,
      409,
      { field: "expectedAmount", entity: "payment" }
    );
  }
  if (parsePaymentAmount(trimmed) === null) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.AMOUNT_DUE_MISSING,
      PAYMENT_USER_MESSAGES.AMOUNT_DUE_MISSING,
      409,
      { field: "expectedAmount", entity: "payment" }
    );
  }
  return trimmed;
}

export function copiedCurrencyFromContract(contract: PaymentReadyContract): string {
  if (isBlank(contract.currency)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.CURRENCY_MISSING,
      PAYMENT_USER_MESSAGES.CURRENCY_MISSING,
      409,
      { field: "currency", entity: "payment" }
    );
  }
  return String(contract.currency).trim().toUpperCase();
}

export function paymentReadyContractRef(contract: PaymentReadyContract): string {
  return `${contract.businessId}:${contract.orderId}:${contract.financialInstructionType}`;
}

function claimedMismatch(
  claimed: Partial<PaymentReadyContract>,
  trusted: PaymentReadyContract,
  field: keyof PaymentReadyContract
): boolean {
  const value = claimed[field];
  if (value === undefined) {
    return false;
  }
  return String(value ?? "") !== String(trusted[field] ?? "");
}

export function assertTrustedPaymentReadyContract(input: {
  contextBusinessId: string;
  trusted: PaymentReadyContract | null;
  claimed?: Partial<PaymentReadyContract> | null;
}): PaymentReadyContract {
  const { trusted, claimed, contextBusinessId } = input;
  if (!trusted) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.CONTRACT_MISSING,
      PAYMENT_USER_MESSAGES.CONTRACT_MISSING,
      404,
      { entity: "payment" }
    );
  }
  if (trusted.businessId !== contextBusinessId) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.CROSS_BUSINESS_ACCESS,
      PAYMENT_USER_MESSAGES.CROSS_BUSINESS_ACCESS,
      403,
      { entity: "payment" }
    );
  }
  if (claimed) {
    const fields: Array<keyof PaymentReadyContract> = [
      "orderId",
      "businessId",
      "expectedAmount",
      "currency",
      "commercialContractId",
      "snapshotId",
      "financialInstructionType",
    ];
    if (fields.some((field) => claimedMismatch(claimed, trusted, field))) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CONTRACT_TAMPERED,
        PAYMENT_USER_MESSAGES.CONTRACT_TAMPERED,
        409,
        { entity: "payment" }
      );
    }
  }
  if (trusted.expiresAt) {
    const expires = Date.parse(trusted.expiresAt);
    if (!Number.isNaN(expires) && expires < Date.now()) {
      throw new PaymentObligationError(
        PAYMENT_ERROR_CODES.CONTRACT_EXPIRED,
        PAYMENT_USER_MESSAGES.CONTRACT_EXPIRED,
        409,
        { entity: "payment" }
      );
    }
  }
  if (
    PAYMENT_INELIGIBLE_ORDER_STATUSES.includes(
      trusted.operationalStatus as (typeof PAYMENT_INELIGIBLE_ORDER_STATUSES)[number]
    )
  ) {
    const expired = trusted.operationalStatus === "CANCELLED";
    throw new PaymentObligationError(
      expired ? PAYMENT_ERROR_CODES.CONTRACT_EXPIRED : PAYMENT_ERROR_CODES.CONTRACT_NOT_ELIGIBLE,
      expired
        ? PAYMENT_USER_MESSAGES.CONTRACT_EXPIRED
        : PAYMENT_USER_MESSAGES.CONTRACT_NOT_ELIGIBLE,
      409,
      { entity: "payment" }
    );
  }
  if (trusted.financialInstructionType !== PAYMENT_FINANCIAL_INSTRUCTION_TYPES.SALE) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.CONTRACT_NOT_ELIGIBLE,
      PAYMENT_USER_MESSAGES.CONTRACT_NOT_ELIGIBLE,
      409,
      { entity: "payment" }
    );
  }
  if (isBlank(trusted.orderId) || isBlank(trusted.orderNumber)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.CONTRACT_INVALID,
      PAYMENT_USER_MESSAGES.CONTRACT_INVALID,
      409,
      { entity: "payment" }
    );
  }
  if (isBlank(trusted.commercialContractId) || isBlank(trusted.snapshotId)) {
    throw new PaymentObligationError(
      PAYMENT_ERROR_CODES.PROVENANCE_MISSING,
      PAYMENT_USER_MESSAGES.PROVENANCE_MISSING,
      409,
      { entity: "payment" }
    );
  }
  copiedAmountDueFromContract(trusted);
  copiedCurrencyFromContract(trusted);
  return trusted;
}

export function lineBreakdownForProvenance(
  contract: PaymentReadyContract
): PaymentReadyContract["lines"] {
  return contract.lines.map((line) => ({
    orderLineId: line.orderLineId,
    offeringId: line.offeringId,
    expectedPayable: line.expectedPayable,
    currencyCode: line.currencyCode,
  }));
}
