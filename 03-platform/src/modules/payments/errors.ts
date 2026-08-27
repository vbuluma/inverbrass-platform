/**
 * Purpose:
 * Typed, fail-closed errors for BP-007 payment-obligation operations.
 * Messages use business language — no Build Pack or engine jargon.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export const PAYMENT_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  SESSION_REQUIRED: "SESSION_REQUIRED",
  BUSINESS_CONTEXT_REQUIRED: "BUSINESS_CONTEXT_REQUIRED",
  CONTRACT_MISSING: "CONTRACT_MISSING",
  CONTRACT_INVALID: "CONTRACT_INVALID",
  CONTRACT_TAMPERED: "CONTRACT_TAMPERED",
  CONTRACT_EXPIRED: "CONTRACT_EXPIRED",
  CONTRACT_NOT_ELIGIBLE: "CONTRACT_NOT_ELIGIBLE",
  AMOUNT_DUE_MISSING: "AMOUNT_DUE_MISSING",
  CURRENCY_MISSING: "CURRENCY_MISSING",
  CURRENCY_UNSUPPORTED: "CURRENCY_UNSUPPORTED",
  PROVENANCE_MISSING: "PROVENANCE_MISSING",
  CROSS_BUSINESS_ACCESS: "CROSS_BUSINESS_ACCESS",
  OBLIGATION_NOT_FOUND: "OBLIGATION_NOT_FOUND",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  TRANSACTION_NOT_FOUND: "TRANSACTION_NOT_FOUND",
  OBLIGATION_NOT_ELIGIBLE: "OBLIGATION_NOT_ELIGIBLE",
  PAYMENT_LIMIT_EXCEEDED: "PAYMENT_LIMIT_EXCEEDED",
  PAYMENT_PROVIDER_REJECTED: "PAYMENT_PROVIDER_REJECTED",
  PAYMENT_TIMEOUT: "PAYMENT_TIMEOUT",
  PAYMENT_EXPIRED: "PAYMENT_EXPIRED",
  PAYMENT_INVALID_AMOUNT: "PAYMENT_INVALID_AMOUNT",
  PAYMENT_INVALID_CURRENCY: "PAYMENT_INVALID_CURRENCY",
  PAYMENT_DUPLICATE: "PAYMENT_DUPLICATE",
  PAYMENT_UNKNOWN: "PAYMENT_UNKNOWN",
  PAYMENT_CHANNEL_UNAVAILABLE: "PAYMENT_CHANNEL_UNAVAILABLE",
  PAYMENT_AMOUNT_EXCEEDS_OUTSTANDING: "PAYMENT_AMOUNT_EXCEEDS_OUTSTANDING",
  PAYMENT_INVALID_TRANSITION: "PAYMENT_INVALID_TRANSITION",
  PAYMENT_OUTCOME_MISMATCH: "PAYMENT_OUTCOME_MISMATCH",
  PAYMENT_MANUAL_CONFIRMATION_REQUIRED: "PAYMENT_MANUAL_CONFIRMATION_REQUIRED",
  ALLOCATION_NOT_ALLOWED: "ALLOCATION_NOT_ALLOWED",
  ALLOCATION_EXCEEDS_UNALLOCATED: "ALLOCATION_EXCEEDS_UNALLOCATED",
  ALLOCATION_EXCEEDS_OBLIGATION: "ALLOCATION_EXCEEDS_OBLIGATION",
  ALLOCATION_CURRENCY_MISMATCH: "ALLOCATION_CURRENCY_MISMATCH",
  ALLOCATION_NOT_FOUND: "ALLOCATION_NOT_FOUND",
  ALLOCATION_ALREADY_ADJUSTED: "ALLOCATION_ALREADY_ADJUSTED",
  OVERPAYMENT_NOT_ALLOWED: "OVERPAYMENT_NOT_ALLOWED",
  CREDIT_SALES_DISABLED: "CREDIT_SALES_DISABLED",
  NUMBERING_POLICY_MISSING: "NUMBERING_POLICY_MISSING",
  INVOICE_NOT_FOUND: "INVOICE_NOT_FOUND",
  INVOICE_ALREADY_EXISTS: "INVOICE_ALREADY_EXISTS",
  INVOICE_INVALID_TRANSITION: "INVOICE_INVALID_TRANSITION",
  INVOICE_ALREADY_CANCELLED: "INVOICE_ALREADY_CANCELLED",
  INVOICE_TERM_INVALID: "INVOICE_TERM_INVALID",
  INVOICE_CUSTOMER_REQUIRED: "INVOICE_CUSTOMER_REQUIRED",
  DOCUMENT_PRODUCTION_UNAVAILABLE: "DOCUMENT_PRODUCTION_UNAVAILABLE",
  RECEIPT_NOT_FOUND: "RECEIPT_NOT_FOUND",
  RECEIPT_NOT_ELIGIBLE: "RECEIPT_NOT_ELIGIBLE",
  RECEIPT_DELIVERY_UNAVAILABLE: "RECEIPT_DELIVERY_UNAVAILABLE",
  REFUND_NOT_ALLOWED: "REFUND_NOT_ALLOWED",
  NO_REFUNDABLE_PAYMENT: "NO_REFUNDABLE_PAYMENT",
  REFUND_AMOUNT_EXCEEDS_REFUNDABLE: "REFUND_AMOUNT_EXCEEDS_REFUNDABLE",
  REFUND_CURRENCY_MISMATCH: "REFUND_CURRENCY_MISMATCH",
  REFUND_ALREADY_COMPLETED: "REFUND_ALREADY_COMPLETED",
  REFUND_PROVIDER_REJECTED: "REFUND_PROVIDER_REJECTED",
  REFUND_EXECUTION_UNAVAILABLE: "REFUND_EXECUTION_UNAVAILABLE",
  REFUND_OUTCOME_UNKNOWN: "REFUND_OUTCOME_UNKNOWN",
  REFUND_APPROVAL_REQUIRED: "REFUND_APPROVAL_REQUIRED",
  REFUND_SELF_APPROVAL: "REFUND_SELF_APPROVAL",
  FINANCIAL_INSTRUCTION_INVALID: "FINANCIAL_INSTRUCTION_INVALID",
  REFUND_NOT_FOUND: "REFUND_NOT_FOUND",
  REFUND_INVALID_TRANSITION: "REFUND_INVALID_TRANSITION",
  SETTLEMENT_NOT_FOUND: "SETTLEMENT_NOT_FOUND",
  SETTLEMENT_NOT_ELIGIBLE: "SETTLEMENT_NOT_ELIGIBLE",
  SETTLEMENT_CONFLICT: "SETTLEMENT_CONFLICT",
  SETTLEMENT_INVALID_TRANSITION: "SETTLEMENT_INVALID_TRANSITION",
  SETTLEMENT_CURRENCY_MISMATCH: "SETTLEMENT_CURRENCY_MISMATCH",
  EXCEPTION_NOT_FOUND: "EXCEPTION_NOT_FOUND",
  EXCEPTION_INVALID_TRANSITION: "EXCEPTION_INVALID_TRANSITION",
  EXCEPTION_RETRY_NOT_ALLOWED: "EXCEPTION_RETRY_NOT_ALLOWED",
  EXCEPTION_RESOLUTION_NOT_ALLOWED: "EXCEPTION_RESOLUTION_NOT_ALLOWED",
  EXCEPTION_SELF_APPROVAL: "EXCEPTION_SELF_APPROVAL",
  EXCEPTION_APPROVAL_REQUIRED: "EXCEPTION_APPROVAL_REQUIRED",
} as const;

export type PaymentErrorCode =
  (typeof PAYMENT_ERROR_CODES)[keyof typeof PAYMENT_ERROR_CODES];

export const PAYMENT_USER_MESSAGES: Record<PaymentErrorCode, string> = {
  INVALID_INPUT: "Please check the highlighted fields and try again.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before continuing.",
  CONTRACT_MISSING: "A confirmed sale is required before a payment amount can be recorded.",
  CONTRACT_INVALID: "The sale payment details are not valid. Open the sale and try again.",
  CONTRACT_TAMPERED:
    "The sale payment details no longer match the original confirmed amount. Open the sale and try again.",
  CONTRACT_EXPIRED: "This sale is no longer available for payment.",
  CONTRACT_NOT_ELIGIBLE: "This sale is not ready for payment yet.",
  AMOUNT_DUE_MISSING: "The amount due is missing from the confirmed sale and cannot be invented.",
  CURRENCY_MISSING: "The sale currency is missing and cannot be substituted.",
  CURRENCY_UNSUPPORTED: "The sale currency is not recognised for this business.",
  PROVENANCE_MISSING:
    "The confirmed sale is missing required commercial references. Confirm the sale again.",
  CROSS_BUSINESS_ACCESS:
    "This payment belongs to another business and cannot be opened here.",
  OBLIGATION_NOT_FOUND: "This payment record could not be found for the current business.",
  IDEMPOTENCY_CONFLICT: "This payment request has already been recorded.",
  PROVIDER_ERROR: "The payment details could not be saved. Please try again.",
  TRANSACTION_NOT_FOUND: "This payment could not be found for the current business.",
  OBLIGATION_NOT_ELIGIBLE: "This payment is not available to collect yet.",
  PAYMENT_LIMIT_EXCEEDED:
    "This amount is higher than the configured limit for the selected payment option.",
  PAYMENT_PROVIDER_REJECTED: "The payment was not accepted. Please try again or choose another option.",
  PAYMENT_TIMEOUT: "The payment request timed out. Check the status before trying again.",
  PAYMENT_EXPIRED: "This payment request has expired.",
  PAYMENT_INVALID_AMOUNT: "Enter a payment amount greater than zero.",
  PAYMENT_INVALID_CURRENCY: "The payment currency does not match the amount due.",
  PAYMENT_DUPLICATE: "This payment has already been recorded.",
  PAYMENT_UNKNOWN: "Payment confirmation is not available yet. Do not send another payment.",
  PAYMENT_CHANNEL_UNAVAILABLE: "This payment option is not available right now.",
  PAYMENT_AMOUNT_EXCEEDS_OUTSTANDING:
    "This amount is higher than the amount still due. Extra payments are not enabled.",
  PAYMENT_INVALID_TRANSITION: "This payment cannot move to that status.",
  PAYMENT_OUTCOME_MISMATCH:
    "The payment confirmation does not match this payment and was not marked successful.",
  PAYMENT_MANUAL_CONFIRMATION_REQUIRED: "Confirm that the payment was received before recording it.",
  ALLOCATION_NOT_ALLOWED: "Only a confirmed successful payment can be applied to the amount due.",
  ALLOCATION_EXCEEDS_UNALLOCATED:
    "This amount is more than the payment still available to apply.",
  ALLOCATION_EXCEEDS_OBLIGATION:
    "This amount is more than the amount still due.",
  ALLOCATION_CURRENCY_MISMATCH: "The payment currency does not match the amount due.",
  ALLOCATION_NOT_FOUND: "This payment allocation could not be found for the current business.",
  ALLOCATION_ALREADY_ADJUSTED: "This allocation has already been corrected.",
  OVERPAYMENT_NOT_ALLOWED:
    "This amount is higher than the amount still due. Extra payments are not enabled.",
  CREDIT_SALES_DISABLED:
    "Unpaid billing is not enabled for this business. Collect the remaining amount due instead.",
  NUMBERING_POLICY_MISSING:
    "Document numbering is not configured for this business.",
  INVOICE_NOT_FOUND: "This invoice could not be found for the current business.",
  INVOICE_ALREADY_EXISTS: "An invoice already exists for this amount due.",
  INVOICE_INVALID_TRANSITION: "This invoice cannot move to that status.",
  INVOICE_ALREADY_CANCELLED: "This invoice has been cancelled and cannot be billed again.",
  INVOICE_TERM_INVALID: "Select a valid payment term.",
  INVOICE_CUSTOMER_REQUIRED: "A customer is required before this invoice can be created.",
  DOCUMENT_PRODUCTION_UNAVAILABLE:
    "The invoice document could not be produced. Please try again.",
  RECEIPT_NOT_FOUND: "This receipt could not be found for the current business.",
  RECEIPT_NOT_ELIGIBLE:
    "A receipt is available only after the payment is successful.",
  RECEIPT_DELIVERY_UNAVAILABLE:
    "The receipt could not be sent. The payment and receipt are unchanged.",
  REFUND_NOT_ALLOWED: "This payment cannot be refunded.",
  NO_REFUNDABLE_PAYMENT: "There is no collected payment to refund.",
  REFUND_AMOUNT_EXCEEDS_REFUNDABLE:
    "This amount is higher than the amount still available to refund.",
  REFUND_CURRENCY_MISMATCH: "The refund currency does not match the original payment.",
  REFUND_ALREADY_COMPLETED: "This refund has already been completed.",
  REFUND_PROVIDER_REJECTED: "The refund was not accepted. The original payment is unchanged.",
  REFUND_EXECUTION_UNAVAILABLE: "The refund could not be processed right now. Please try again.",
  REFUND_OUTCOME_UNKNOWN:
    "Refund confirmation is not available yet. Do not send another refund.",
  REFUND_APPROVAL_REQUIRED: "This refund needs approval before it can be processed.",
  REFUND_SELF_APPROVAL: "The person who requested this refund cannot approve it.",
  FINANCIAL_INSTRUCTION_INVALID:
    "The related sale instruction is not valid for a refund.",
  REFUND_NOT_FOUND: "This refund could not be found for the current business.",
  REFUND_INVALID_TRANSITION: "This refund cannot move to that status.",
  SETTLEMENT_NOT_FOUND: "This settlement could not be found for the current business.",
  SETTLEMENT_NOT_ELIGIBLE: "Settlement can be recorded only after the payment is successful.",
  SETTLEMENT_CONFLICT:
    "This settlement does not match the settlement already recorded for this payment.",
  SETTLEMENT_INVALID_TRANSITION: "This settlement cannot move to that status.",
  SETTLEMENT_CURRENCY_MISMATCH: "The settlement currency does not match the original payment.",
  EXCEPTION_NOT_FOUND: "This payment review item could not be found for the current business.",
  EXCEPTION_INVALID_TRANSITION: "This payment review cannot move to that status.",
  EXCEPTION_RETRY_NOT_ALLOWED:
    "Another payment cannot be started until this payment is confirmed as not accepted.",
  EXCEPTION_RESOLUTION_NOT_ALLOWED: "This payment review cannot be resolved that way.",
  EXCEPTION_SELF_APPROVAL: "The person who requested this review cannot approve it.",
  EXCEPTION_APPROVAL_REQUIRED: "Another person must approve this payment decision.",
};

export class PaymentObligationError extends Error {
  readonly code: PaymentErrorCode;
  readonly statusCode: number;
  readonly field?: string;
  readonly entity?: string;
  readonly nextAction?: string;

  constructor(
    code: PaymentErrorCode,
    message: string = PAYMENT_USER_MESSAGES[code],
    statusCode = 400,
    options?: { field?: string; entity?: string; nextAction?: string }
  ) {
    super(message);
    this.name = "PaymentObligationError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = options?.field;
    this.entity = options?.entity;
    this.nextAction = options?.nextAction;
  }
}
