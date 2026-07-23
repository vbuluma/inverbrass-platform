export const AUTH_ERROR_CODES = {
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  ACCOUNT_DEACTIVATED: "ACCOUNT_DEACTIVATED",
  ACCOUNT_LOCKED: "ACCOUNT_LOCKED",
  NO_BUSINESS_ACCESS: "NO_BUSINESS_ACCESS",
  BUSINESS_UNAVAILABLE: "BUSINESS_UNAVAILABLE",
  INVALID_INPUT: "INVALID_INPUT",
  PROVIDER_ERROR: "PROVIDER_ERROR",
  SESSION_REQUIRED: "SESSION_REQUIRED",
  MUST_CHANGE_PASSWORD: "MUST_CHANGE_PASSWORD",
  PHONE_ALREADY_REGISTERED: "PHONE_ALREADY_REGISTERED",
  REGISTRATION_FAILED: "REGISTRATION_FAILED",
  INVALID_SECURITY_QUESTION: "INVALID_SECURITY_QUESTION",
  CURRENT_PASSWORD_INVALID: "CURRENT_PASSWORD_INVALID",
  SECURITY_QUESTION_REQUIRED: "SECURITY_QUESTION_REQUIRED",
  FIRST_LOGIN_NOT_REQUIRED: "FIRST_LOGIN_NOT_REQUIRED",
} as const;

export type AuthErrorCode =
  (typeof AUTH_ERROR_CODES)[keyof typeof AUTH_ERROR_CODES];

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly statusCode: number;

  constructor(code: AuthErrorCode, message: string, statusCode = 400) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export const AUTH_USER_MESSAGES = {
  INVALID_CREDENTIALS: "Incorrect mobile number or password.",
  ACCOUNT_DEACTIVATED: "Your account is currently unavailable.",
  ACCOUNT_LOCKED:
    "Your account is temporarily locked. Try again later or contact support.",
  NO_BUSINESS_ACCESS: "You do not have access to any active business.",
  BUSINESS_UNAVAILABLE: "This business is currently unavailable.",
  INVALID_INPUT: "Please check your details and try again.",
  PROVIDER_ERROR: "We could not complete authentication. Please try again.",
  SESSION_REQUIRED: "Your session has expired. Please sign in again.",
  MUST_CHANGE_PASSWORD: "You must change your password before continuing.",
  PHONE_ALREADY_REGISTERED:
    "This mobile number is already registered. Sign in or recover your account.",
  REGISTRATION_FAILED:
    "We could not complete registration. Please try again.",
  INVALID_SECURITY_QUESTION:
    "Select a valid security question and try again.",
  CURRENT_PASSWORD_INVALID: "Your current password is incorrect.",
  SECURITY_QUESTION_REQUIRED:
    "Select a security question and provide an answer to continue.",
  FIRST_LOGIN_NOT_REQUIRED:
    "Password change is not required for your account.",
} as const;
