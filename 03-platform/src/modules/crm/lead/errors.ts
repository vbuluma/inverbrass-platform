/**
 * Purpose:
 * Typed errors for Lead Management operations.
 *
 * Implementation Package:
 * BP-004 / IP-02 – Lead Management
 */

export const LEAD_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  LEAD_NOT_FOUND: "LEAD_NOT_FOUND",
  PARTY_NOT_FOUND: "PARTY_NOT_FOUND",
  DUPLICATE_ACTIVE_LEAD: "DUPLICATE_ACTIVE_LEAD",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  LEAD_READ_ONLY: "LEAD_READ_ONLY",
  DISQUALIFICATION_REASON_REQUIRED: "DISQUALIFICATION_REASON_REQUIRED",
  CONVERSION_NOT_ALLOWED: "CONVERSION_NOT_ALLOWED",
  REFERENCE_DATA_MISSING: "REFERENCE_DATA_MISSING",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  DUPLICATE_CRM_PARTY: "DUPLICATE_CRM_PARTY",
} as const;

export type LeadErrorCode =
  (typeof LEAD_ERROR_CODES)[keyof typeof LEAD_ERROR_CODES];

export class LeadError extends Error {
  readonly code: LeadErrorCode;
  readonly statusCode: number;
  readonly field?: string;

  constructor(
    code: LeadErrorCode,
    message: string,
    statusCode = 400,
    field?: string
  ) {
    super(message);
    this.name = "LeadError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}

export const LEAD_USER_MESSAGES = {
  REFERENCE_DATA_MISSING:
    "Lead reference data is not available. Contact your administrator.",
  DUPLICATE_ACTIVE_LEAD:
    "An active lead already exists for this party. Complete or disqualify it first.",
  LEAD_READ_ONLY: "Converted leads are read-only.",
  INVALID_STATUS_TRANSITION: "That lead status change is not allowed.",
  DISQUALIFICATION_REASON_REQUIRED: "A disqualification reason is required.",
  CONVERSION_NOT_ALLOWED: "Only qualified leads can be converted.",
} as const;
