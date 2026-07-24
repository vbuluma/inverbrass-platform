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
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;

export type SetupErrorCode =
  (typeof SETUP_ERROR_CODES)[keyof typeof SETUP_ERROR_CODES];

export class SetupError extends Error {
  readonly code: SetupErrorCode;
  readonly statusCode: number;

  constructor(code: SetupErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = "SetupError";
    this.code = code;
    this.statusCode = statusCode;
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
  PROVIDER_ERROR: "We could not save your setup progress. Please try again.",
} as const;
