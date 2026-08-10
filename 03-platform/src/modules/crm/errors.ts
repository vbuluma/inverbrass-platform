/**
 * Purpose:
 * Typed errors for CRM Sales & Marketing operations.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline
 */

export const CRM_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  SESSION_REQUIRED: "SESSION_REQUIRED",
  BUSINESS_CONTEXT_REQUIRED: "BUSINESS_CONTEXT_REQUIRED",
  QUOTATION_NOT_FOUND: "QUOTATION_NOT_FOUND",
  QUOTATION_VERSION_NOT_FOUND: "QUOTATION_VERSION_NOT_FOUND",
  QUOTATION_LINE_NOT_FOUND: "QUOTATION_LINE_NOT_FOUND",
  DUPLICATE_QUOTATION_NUMBER: "DUPLICATE_QUOTATION_NUMBER",
  INVALID_QUOTATION_STATUS: "INVALID_QUOTATION_STATUS",
  INVALID_QUOTATION_STATUS_TRANSITION: "INVALID_QUOTATION_STATUS_TRANSITION",
  QUOTATION_VERSION_LOCKED: "QUOTATION_VERSION_LOCKED",
  QUOTATION_EXPIRED: "QUOTATION_EXPIRED",
  QUOTATION_LINE_REQUIRED: "QUOTATION_LINE_REQUIRED",
  INVALID_LINE_QUANTITY: "INVALID_LINE_QUANTITY",
  INVALID_LINE_PRICE: "INVALID_LINE_PRICE",
  PARTY_NOT_FOUND: "PARTY_NOT_FOUND",
  OFFERING_NOT_FOUND: "OFFERING_NOT_FOUND",
  PRICING_CATALOGUE_NOT_FOUND: "PRICING_CATALOGUE_NOT_FOUND",
  PRICE_NOT_FOUND: "PRICE_NOT_FOUND",
  OFFERING_NOT_SELLABLE: "OFFERING_NOT_SELLABLE",
  QUOTATION_NOT_EDITABLE: "QUOTATION_NOT_EDITABLE",
  APPROVAL_REQUIRED: "APPROVAL_REQUIRED",
  APPROVAL_PENDING: "APPROVAL_PENDING",
  APPROVAL_REJECTED: "APPROVAL_REJECTED",
  SALES_ORDER_NOT_FOUND: "SALES_ORDER_NOT_FOUND",
  SALES_ORDER_ALREADY_EXISTS: "SALES_ORDER_ALREADY_EXISTS",
  CAMPAIGN_NOT_FOUND: "CAMPAIGN_NOT_FOUND",
  CAMPAIGN_MEMBER_NOT_FOUND: "CAMPAIGN_MEMBER_NOT_FOUND",
  DUPLICATE_CAMPAIGN_NUMBER: "DUPLICATE_CAMPAIGN_NUMBER",
  INVALID_CAMPAIGN_STATUS_TRANSITION: "INVALID_CAMPAIGN_STATUS_TRANSITION",
  CAMPAIGN_READ_ONLY: "CAMPAIGN_READ_ONLY",
  CAMPAIGN_CONSENT_REQUIRED: "CAMPAIGN_CONSENT_REQUIRED",
  PARTY_GROUP_NOT_FOUND: "PARTY_GROUP_NOT_FOUND",
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;

export type CrmErrorCode =
  (typeof CRM_ERROR_CODES)[keyof typeof CRM_ERROR_CODES];

export const CRM_USER_MESSAGES = {
  INVALID_INPUT: "Please check the information entered and try again.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business to continue.",
  QUOTATION_NOT_FOUND: "Quotation not found.",
  QUOTATION_VERSION_NOT_FOUND: "Quotation version not found.",
  QUOTATION_LINE_NOT_FOUND: "Quotation line item not found.",
  DUPLICATE_QUOTATION_NUMBER: "A quotation with this number already exists.",
  INVALID_QUOTATION_STATUS: "The quotation status is not valid.",
  INVALID_QUOTATION_STATUS_TRANSITION:
    "This quotation cannot move to the selected status.",
  QUOTATION_VERSION_LOCKED:
    "This quotation version is locked and cannot be changed.",
  QUOTATION_EXPIRED: "This quotation has expired and cannot be converted.",
  QUOTATION_LINE_REQUIRED: "Add at least one line item to the quotation.",
  INVALID_LINE_QUANTITY: "Quantity must be greater than zero.",
  INVALID_LINE_PRICE: "Unit price cannot be negative.",
  PARTY_NOT_FOUND: "The selected customer could not be found.",
  OFFERING_NOT_FOUND: "The selected offering could not be found.",
  PRICING_CATALOGUE_NOT_FOUND: "The selected price list could not be found.",
  PRICE_NOT_FOUND:
    "No active price was found for this offering with the selected criteria.",
  OFFERING_NOT_SELLABLE: "This offering is not available for quotation.",
  QUOTATION_NOT_EDITABLE:
    "This quotation cannot be edited in its current status.",
  APPROVAL_REQUIRED:
    "This quotation requires approval before it can be sent.",
  APPROVAL_PENDING: "Approval is pending for this quotation.",
  APPROVAL_REJECTED: "This quotation was rejected during approval.",
  SALES_ORDER_NOT_FOUND: "Sales order not found.",
  SALES_ORDER_ALREADY_EXISTS: "A sales order already exists for this quotation.",
  CAMPAIGN_NOT_FOUND: "Campaign not found.",
  CAMPAIGN_MEMBER_NOT_FOUND: "Campaign member not found.",
  DUPLICATE_CAMPAIGN_NUMBER: "A campaign with this number already exists.",
  INVALID_CAMPAIGN_STATUS_TRANSITION:
    "This campaign cannot move to the selected status.",
  CAMPAIGN_READ_ONLY:
    "Completed or cancelled campaigns cannot be modified.",
  CAMPAIGN_CONSENT_REQUIRED:
    "Marketing consent is required before campaign outreach.",
  PARTY_GROUP_NOT_FOUND: "The selected party group could not be found.",
  PROVIDER_ERROR: "Something went wrong. Please try again.",
} as const;

export class CrmError extends Error {
  constructor(
    readonly code: CrmErrorCode,
    message: string,
    readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "CrmError";
  }
}
