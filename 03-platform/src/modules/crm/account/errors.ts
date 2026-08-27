/**
 * Purpose:
 * Typed errors for Account & Contact Management.
 *
 * Implementation Package:
 * BP-004 / IP-04 – Customer & Contact Management
 */

export const ACCOUNT_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  ACCOUNT_NOT_FOUND: "ACCOUNT_NOT_FOUND",
  CONTACT_ROLE_NOT_FOUND: "CONTACT_ROLE_NOT_FOUND",
  PARTY_NOT_FOUND: "PARTY_NOT_FOUND",
  DUPLICATE_ACCOUNT_NAME: "DUPLICATE_ACCOUNT_NAME",
  CIRCULAR_HIERARCHY: "CIRCULAR_HIERARCHY",
  HIERARCHY_DEPTH_EXCEEDED: "HIERARCHY_DEPTH_EXCEEDED",
  PRIMARY_CONTACT_EXISTS: "PRIMARY_CONTACT_EXISTS",
  REFERENCE_DATA_MISSING: "REFERENCE_DATA_MISSING",
  VERSION_CONFLICT: "VERSION_CONFLICT",
  ACCOUNT_READ_ONLY: "ACCOUNT_READ_ONLY",
} as const;

export type AccountErrorCode =
  (typeof ACCOUNT_ERROR_CODES)[keyof typeof ACCOUNT_ERROR_CODES];

export class AccountError extends Error {
  readonly code: AccountErrorCode;
  readonly statusCode: number;
  readonly field?: string;

  constructor(
    code: AccountErrorCode,
    message: string,
    statusCode = 400,
    field?: string
  ) {
    super(message);
    this.name = "AccountError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}

export const ACCOUNT_USER_MESSAGES = {
  REFERENCE_DATA_MISSING:
    "Account reference data is not available. Contact your administrator.",
  DUPLICATE_ACCOUNT_NAME: "An account with this name already exists.",
  CIRCULAR_HIERARCHY: "That parent would create a circular account hierarchy.",
  HIERARCHY_DEPTH_EXCEEDED: "Account hierarchy depth limit exceeded.",
  ACCOUNT_READ_ONLY: "Closed accounts are read-only.",
} as const;
