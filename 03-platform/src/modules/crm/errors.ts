/**
 * Purpose:
 * Typed errors for CRM Foundation operations.
 *
 * Implementation Package:
 * BP-004 / IP-001 – CRM Foundation & Customer 360
 */

export const CRM_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  SESSION_REQUIRED: "SESSION_REQUIRED",
  BUSINESS_CONTEXT_REQUIRED: "BUSINESS_CONTEXT_REQUIRED",
  CRM_RECORD_NOT_FOUND: "CRM_RECORD_NOT_FOUND",
  PARTY_NOT_FOUND: "PARTY_NOT_FOUND",
  DUPLICATE_CRM_PARTY: "DUPLICATE_CRM_PARTY",
  DUPLICATE_CUSTOMER_NUMBER: "DUPLICATE_CUSTOMER_NUMBER",
  INVALID_CRM_TYPE: "INVALID_CRM_TYPE",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  REFERENCE_DATA_MISSING: "REFERENCE_DATA_MISSING",
  CRM_RECORD_READ_ONLY: "CRM_RECORD_READ_ONLY",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;

export type CrmErrorCode =
  (typeof CRM_ERROR_CODES)[keyof typeof CRM_ERROR_CODES];

export class CrmError extends Error {
  readonly code: CrmErrorCode;
  readonly statusCode: number;
  readonly field?: string;

  constructor(
    code: CrmErrorCode,
    message: string,
    statusCode = 400,
    field?: string
  ) {
    super(message);
    this.name = "CrmError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}

export const CRM_USER_MESSAGES = {
  REFERENCE_DATA_MISSING:
    "CRM reference data is not available. Contact your administrator.",
  DUPLICATE_CRM_PARTY:
    "A customer record already exists for this party in your business.",
  CRM_RECORD_READ_ONLY: "This customer record is read-only.",
  INVALID_STATUS_TRANSITION: "That customer status change is not allowed.",
} as const;
