/**
 * Purpose:
 * Typed errors for Business Setup Wizard operations.
 *
 * Implementation Package:
 * IP-006 – Business Setup Wizard, Configuration & Activation
 */

export const SETUP_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  SESSION_REQUIRED: "SESSION_REQUIRED",
  BUSINESS_CONTEXT_REQUIRED: "BUSINESS_CONTEXT_REQUIRED",
  SETUP_ALREADY_COMPLETE: "SETUP_ALREADY_COMPLETE",
  STEP_NOT_ALLOWED: "STEP_NOT_ALLOWED",
  MANDATORY_INCOMPLETE: "MANDATORY_INCOMPLETE",
  DUPLICATE_CURRENCY: "DUPLICATE_CURRENCY",
  BASE_CURRENCY_REQUIRED: "BASE_CURRENCY_REQUIRED",
  COUNTRY_REQUIRED: "COUNTRY_REQUIRED",
  BUSINESS_NOT_DRAFT: "BUSINESS_NOT_DRAFT",
  BRANCH_REQUIRED: "BRANCH_REQUIRED",
  DUPLICATE_PHONE: "DUPLICATE_PHONE",
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;

export type SetupErrorCode =
  (typeof SETUP_ERROR_CODES)[keyof typeof SETUP_ERROR_CODES];

export class SetupError extends Error {
  readonly code: SetupErrorCode;
  readonly statusCode: number;
  /** Optional form field to highlight; does not change workflow routing. */
  readonly field?: string;

  constructor(
    code: SetupErrorCode,
    message: string,
    statusCode = 400,
    field?: string
  ) {
    super(message);
    this.name = "SetupError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}

export const SETUP_USER_MESSAGES = {
  INVALID_INPUT: "Please check your details and try again.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  BUSINESS_CONTEXT_REQUIRED: "Select a business before continuing setup.",
  SETUP_ALREADY_COMPLETE: "This business is already activated.",
  STEP_NOT_ALLOWED: "Complete the previous setup steps first.",
  MANDATORY_INCOMPLETE:
    "Complete all mandatory setup steps before activating the business.",
  DUPLICATE_CURRENCY: "That currency has already been added.",
  BASE_CURRENCY_REQUIRED: "Select a base currency to continue.",
  COUNTRY_REQUIRED: "Select a country before configuring currency.",
  BUSINESS_NOT_DRAFT: "Only draft businesses can be configured in setup.",
  BRANCH_REQUIRED: "Configure at least one branch before continuing.",
  DUPLICATE_PHONE: "That mobile number is already registered.",
  PROVIDER_ERROR: "We could not save your setup progress. Please try again.",
} as const;
