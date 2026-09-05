/**
 * Purpose:
 * Typed, fail-closed errors for BP-006 sales/order operations.
 * Messages use business language — no Build Pack or engine jargon.
 *
 * Implementation Package:
 * BP-006 / IP-01 – Sales & Order Creation
 */

export const SALES_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  SESSION_REQUIRED: "SESSION_REQUIRED",
  BUSINESS_CONTEXT_REQUIRED: "BUSINESS_CONTEXT_REQUIRED",
  ORDER_NOT_FOUND: "ORDER_NOT_FOUND",
  ORDER_ALREADY_EXISTS: "ORDER_ALREADY_EXISTS",
  ORDER_NUMBER_NOT_UNIQUE: "ORDER_NUMBER_NOT_UNIQUE",
  CUSTOMER_NOT_FOUND: "CUSTOMER_NOT_FOUND",
  CUSTOMER_NOT_IN_BUSINESS: "CUSTOMER_NOT_IN_BUSINESS",
  OFFERING_NOT_FOUND: "OFFERING_NOT_FOUND",
  OFFERING_NOT_IN_BUSINESS: "OFFERING_NOT_IN_BUSINESS",
  QUOTATION_NOT_FOUND: "QUOTATION_NOT_FOUND",
  QUOTATION_NOT_IN_BUSINESS: "QUOTATION_NOT_IN_BUSINESS",
  QUOTATION_NOT_ELIGIBLE: "QUOTATION_NOT_ELIGIBLE",
  QUOTATION_ALREADY_CONVERTED: "QUOTATION_ALREADY_CONVERTED",
  REQUIRED_LINES_MISSING: "REQUIRED_LINES_MISSING",
  INVALID_QUANTITY: "INVALID_QUANTITY",
  QUANTITY_CONTRACT_MISMATCH: "QUANTITY_CONTRACT_MISMATCH",
  COMMERCIAL_CONTRACT_REQUIRED: "COMMERCIAL_CONTRACT_REQUIRED",
  COMMERCIAL_CONTRACT_INVALID: "COMMERCIAL_CONTRACT_INVALID",
  COMMERCIAL_CONTRACT_TAMPERED: "COMMERCIAL_CONTRACT_TAMPERED",
  COMMERCIAL_CURRENCY_MISMATCH: "COMMERCIAL_CURRENCY_MISMATCH",
  COMMERCIAL_AMOUNT_MISMATCH: "COMMERCIAL_AMOUNT_MISMATCH",
  COMMERCIAL_OFFERING_MISMATCH: "COMMERCIAL_OFFERING_MISMATCH",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  MATERIAL_VALUE_IMMUTABLE: "MATERIAL_VALUE_IMMUTABLE",
  SOD_VIOLATION: "SOD_VIOLATION",
  ORDER_ALREADY_CONFIRMED: "ORDER_ALREADY_CONFIRMED",
  CONFIRMATION_NOT_PENDING: "CONFIRMATION_NOT_PENDING",
  CROSS_BUSINESS_ACCESS: "CROSS_BUSINESS_ACCESS",
  FULFILMENT_NOT_ALLOWED: "FULFILMENT_NOT_ALLOWED",
  COMPLETION_BLOCKED: "COMPLETION_BLOCKED",
  COMPLETION_NOT_PENDING: "COMPLETION_NOT_PENDING",
  ORDER_ALREADY_COMPLETED: "ORDER_ALREADY_COMPLETED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  ACCEPTED_EXCEEDS_ORDERED: "ACCEPTED_EXCEEDS_ORDERED",
  CANCELLATION_NOT_AUTHORIZED: "CANCELLATION_NOT_AUTHORIZED",
  INVALID_FULFILMENT_OUTCOME: "INVALID_FULFILMENT_OUTCOME",
  DELIVERY_NOT_FOUND: "DELIVERY_NOT_FOUND",
  DELIVERY_ALREADY_INSPECTED: "DELIVERY_ALREADY_INSPECTED",
  INSPECTION_REQUIRED: "INSPECTION_REQUIRED",
  REJECTION_REASON_REQUIRED: "REJECTION_REASON_REQUIRED",
  COMMENTS_REQUIRED: "COMMENTS_REQUIRED",
  EVIDENCE_REQUIRED: "EVIDENCE_REQUIRED",
  LINE_TYPE_MISMATCH: "LINE_TYPE_MISMATCH",
  DELIVERED_EXCEEDS_ORDERED: "DELIVERED_EXCEEDS_ORDERED",
  SERVICE_NOT_STARTED: "SERVICE_NOT_STARTED",
  SERVICE_ALREADY_COMPLETED: "SERVICE_ALREADY_COMPLETED",
  CANCELLATION_REASON_REQUIRED: "CANCELLATION_REASON_REQUIRED",
  RETURN_REASON_REQUIRED: "RETURN_REASON_REQUIRED",
  DISPOSITION_NOT_FOUND: "DISPOSITION_NOT_FOUND",
  DISPOSITION_NOT_PENDING: "DISPOSITION_NOT_PENDING",
  DISPOSITION_QUANTITY_INVALID: "DISPOSITION_QUANTITY_INVALID",
  AMENDMENT_NOT_FOUND: "AMENDMENT_NOT_FOUND",
  AMENDMENT_NOT_PENDING: "AMENDMENT_NOT_PENDING",
  COMPLETED_ORDER_NOT_CANCELLABLE: "COMPLETED_ORDER_NOT_CANCELLABLE",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  IDEMPOTENCY_KEY_REQUIRED: "IDEMPOTENCY_KEY_REQUIRED",
  IDEMPOTENCY_PAYLOAD_MISMATCH: "IDEMPOTENCY_PAYLOAD_MISMATCH",
  IDEMPOTENCY_CONFLICT: "IDEMPOTENCY_CONFLICT",
} as const;

export type SalesErrorCode =
  (typeof SALES_ERROR_CODES)[keyof typeof SALES_ERROR_CODES];

export const SALES_USER_MESSAGES: Record<SalesErrorCode, string> = {
  INVALID_INPUT: "Please check the highlighted fields and try again.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before creating a sale.",
  ORDER_NOT_FOUND: "This sale could not be found for the current business.",
  ORDER_ALREADY_EXISTS: "A sale already exists for this quotation.",
  ORDER_NUMBER_NOT_UNIQUE: "That order number is already used in this business.",
  CUSTOMER_NOT_FOUND: "Select an existing customer to continue.",
  CUSTOMER_NOT_IN_BUSINESS:
    "That customer belongs to another business. Choose a customer from this business.",
  OFFERING_NOT_FOUND: "Select an existing product or service to continue.",
  OFFERING_NOT_IN_BUSINESS:
    "That product or service belongs to another business. Choose one from this business.",
  QUOTATION_NOT_FOUND: "This quotation could not be found for the current business.",
  QUOTATION_NOT_IN_BUSINESS:
    "That quotation belongs to another business and cannot be converted.",
  QUOTATION_NOT_ELIGIBLE:
    "Only an accepted quotation can be converted to a sale. Accept it first, or start a new sale.",
  QUOTATION_ALREADY_CONVERTED: "This quotation has already been converted to a sale.",
  REQUIRED_LINES_MISSING: "Add at least one product or service with a quantity.",
  INVALID_QUANTITY: "Enter a quantity greater than zero.",
  QUANTITY_CONTRACT_MISMATCH:
    "Quantity must match the commercial total already prepared. Refresh the commercial total and try again.",
  COMMERCIAL_CONTRACT_REQUIRED:
    "A commercial total is required before this sale can be saved or confirmed.",
  COMMERCIAL_CONTRACT_INVALID:
    "The commercial total is not valid. Prepare it again before confirming this sale.",
  COMMERCIAL_CONTRACT_TAMPERED:
    "The commercial total no longer matches the original result. Prepare it again before confirming.",
  COMMERCIAL_CURRENCY_MISMATCH:
    "The sale currency does not match the commercial total. Use the same currency, or prepare the total again.",
  COMMERCIAL_AMOUNT_MISMATCH:
    "The expected total must come from the commercial result and cannot be entered separately.",
  COMMERCIAL_OFFERING_MISMATCH:
    "The commercial total is for a different product or service. Prepare the total for the selected item.",
  INVALID_STATUS_TRANSITION:
    "This sale cannot move to that status from its current state.",
  MATERIAL_VALUE_IMMUTABLE:
    "Customer, products, quantities, currency, and expected total cannot be changed after confirmation. Use a controlled amendment later.",
  SOD_VIOLATION:
    "You cannot approve a sale action that you submitted. Another authorised person must approve it.",
  ORDER_ALREADY_CONFIRMED: "This sale is already confirmed.",
  CONFIRMATION_NOT_PENDING: "This sale is not waiting for confirmation.",
  CROSS_BUSINESS_ACCESS:
    "This sale belongs to another business and cannot be opened here.",
  FULFILMENT_NOT_ALLOWED:
    "Delivery and fulfilment cannot continue for this sale in its current state.",
  COMPLETION_BLOCKED:
    "This sale cannot be completed yet. Review the outstanding items and try again.",
  COMPLETION_NOT_PENDING: "This sale is not waiting for completion approval.",
  ORDER_ALREADY_COMPLETED: "This sale is already completed.",
  ORDER_CANCELLED:
    "This sale is cancelled. Delivery and fulfilment cannot continue.",
  ACCEPTED_EXCEEDS_ORDERED:
    "Accepted quantity cannot be greater than the ordered quantity.",
  CANCELLATION_NOT_AUTHORIZED:
    "Cancellation must be started through the controlled cancellation process.",
  INVALID_FULFILMENT_OUTCOME:
    "Delivery results for this sale are not valid and cannot be applied.",
  DELIVERY_NOT_FOUND: "This delivery record could not be found for the current sale.",
  DELIVERY_ALREADY_INSPECTED: "This delivery has already been inspected.",
  INSPECTION_REQUIRED:
    "Inspect the arrived goods before this line can be marked complete.",
  REJECTION_REASON_REQUIRED: "Choose a reason when any quantity is rejected.",
  COMMENTS_REQUIRED:
    "Add a comment when you accept only part of the delivery or reject any quantity.",
  EVIDENCE_REQUIRED: "Add proof of delivery or service before completing this step.",
  LINE_TYPE_MISMATCH: "Use the goods flow for products and the service flow for services.",
  DELIVERED_EXCEEDS_ORDERED:
    "Arrived quantity cannot be greater than the ordered quantity.",
  SERVICE_NOT_STARTED: "Start the service before marking it complete.",
  SERVICE_ALREADY_COMPLETED: "This service is already complete.",
  CANCELLATION_REASON_REQUIRED: "Choose a reason before cancelling this sale.",
  RETURN_REASON_REQUIRED: "Choose a reason before starting a return or replacement.",
  DISPOSITION_NOT_FOUND: "That return or cancellation request could not be found.",
  DISPOSITION_NOT_PENDING: "This request is not waiting for approval.",
  DISPOSITION_QUANTITY_INVALID:
    "The quantity for this decision cannot be more than the rejected quantity still waiting for a decision.",
  AMENDMENT_NOT_FOUND: "That change request could not be found.",
  AMENDMENT_NOT_PENDING: "This change request is not waiting for approval.",
  COMPLETED_ORDER_NOT_CANCELLABLE:
    "A completed sale cannot be cancelled as an ordinary edit. Use a controlled correction.",
  PROVIDER_ERROR: "The sale could not be completed. Please try again.",
  IDEMPOTENCY_KEY_REQUIRED:
    "This purchase request is missing a safety reference. Refresh and try again.",
  IDEMPOTENCY_PAYLOAD_MISMATCH:
    "This purchase reference was already used for a different order. Start a new checkout.",
  IDEMPOTENCY_CONFLICT:
    "This purchase is already being processed. Check your order status.",
};

export class SalesOrderError extends Error {
  readonly code: SalesErrorCode;
  readonly statusCode: number;
  readonly field?: string;
  readonly entity?: string;
  readonly nextAction?: string;

  constructor(
    code: SalesErrorCode,
    message: string = SALES_USER_MESSAGES[code],
    statusCode = 400,
    options?: { field?: string; entity?: string; nextAction?: string }
  ) {
    super(message);
    this.name = "SalesOrderError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = options?.field;
    this.entity = options?.entity;
    this.nextAction = options?.nextAction;
  }
}
