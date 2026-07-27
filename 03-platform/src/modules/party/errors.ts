/**
 * Purpose:
 * Typed errors for Party Foundation operations.
 *
 * Implementation Package:
 * BP-002 / IP-001 – Party Foundation
 */

export const PARTY_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  SESSION_REQUIRED: "SESSION_REQUIRED",
  BUSINESS_CONTEXT_REQUIRED: "BUSINESS_CONTEXT_REQUIRED",
  PARTY_NOT_FOUND: "PARTY_NOT_FOUND",
  PARTY_TYPE_IMMUTABLE: "PARTY_TYPE_IMMUTABLE",
  INVALID_PARTY_TYPE: "INVALID_PARTY_TYPE",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  REFERENCE_DATA_MISSING: "REFERENCE_DATA_MISSING",
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;

export type PartyErrorCode =
  (typeof PARTY_ERROR_CODES)[keyof typeof PARTY_ERROR_CODES];

export class PartyError extends Error {
  readonly code: PartyErrorCode;
  readonly statusCode: number;
  readonly field?: string;

  constructor(
    code: PartyErrorCode,
    message: string,
    statusCode = 400,
    field?: string
  ) {
    super(message);
    this.name = "PartyError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}

export const PARTY_USER_MESSAGES = {
  INVALID_INPUT: "Please check your details and try again.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before managing parties.",
  PARTY_NOT_FOUND: "That party could not be found.",
  PARTY_TYPE_IMMUTABLE: "Party type cannot be changed after creation.",
  INVALID_PARTY_TYPE: "Select Individual or Organization.",
  INVALID_STATUS_TRANSITION: "That status change is not allowed.",
  REFERENCE_DATA_MISSING:
    "Required Party reference data is missing. Seed Party catalogues before continuing.",
  PROVIDER_ERROR: "We could not complete that Party action. Please try again.",
} as const;
