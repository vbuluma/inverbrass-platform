/**
 * Purpose:
 * Typed errors for Opportunity Management.
 *
 * Implementation Package:
 * BP-004 / IP-03 – Opportunity Management
 */

export const OPPORTUNITY_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  OPPORTUNITY_NOT_FOUND: "OPPORTUNITY_NOT_FOUND",
  CRM_RECORD_NOT_FOUND: "CRM_RECORD_NOT_FOUND",
  INVALID_STAGE_TRANSITION: "INVALID_STAGE_TRANSITION",
  OPPORTUNITY_READ_ONLY: "OPPORTUNITY_READ_ONLY",
  LOSS_REASON_REQUIRED: "LOSS_REASON_REQUIRED",
  CLOSE_FIELDS_REQUIRED: "CLOSE_FIELDS_REQUIRED",
  REFERENCE_DATA_MISSING: "REFERENCE_DATA_MISSING",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
} as const;

export type OpportunityErrorCode =
  (typeof OPPORTUNITY_ERROR_CODES)[keyof typeof OPPORTUNITY_ERROR_CODES];

export class OpportunityError extends Error {
  readonly code: OpportunityErrorCode;
  readonly statusCode: number;
  readonly field?: string;

  constructor(
    code: OpportunityErrorCode,
    message: string,
    statusCode = 400,
    field?: string
  ) {
    super(message);
    this.name = "OpportunityError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}

export const OPPORTUNITY_USER_MESSAGES = {
  REFERENCE_DATA_MISSING:
    "Opportunity reference data is not available. Contact your administrator.",
  OPPORTUNITY_READ_ONLY: "Closed opportunities are read-only.",
  INVALID_STAGE_TRANSITION: "That stage change is not allowed for this pipeline.",
  LOSS_REASON_REQUIRED: "A loss reason is required when marking an opportunity lost.",
  CLOSE_FIELDS_REQUIRED: "Close date and final amount are required when marking won.",
} as const;
