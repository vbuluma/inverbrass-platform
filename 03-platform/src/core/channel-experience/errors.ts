/**
 * Purpose:
 * ENG-003o — Channel & Experience Engine errors.
 */

export const CHANNEL_EXPERIENCE_ERROR_CODES = {
  CHANNEL_NOT_ALLOWED: "CHANNEL_NOT_ALLOWED",
  CAPABILITY_NOT_REGISTERED: "CAPABILITY_NOT_REGISTERED",
  CAPABILITY_DENIED: "CAPABILITY_DENIED",
  AUTHENTICATION_REQUIRED: "AUTHENTICATION_REQUIRED",
  BUSINESS_CONTEXT_REQUIRED: "BUSINESS_CONTEXT_REQUIRED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  IDENTITY_RESOLUTION_FAILED: "IDENTITY_RESOLUTION_FAILED",
} as const;

export type ChannelExperienceErrorCode =
  (typeof CHANNEL_EXPERIENCE_ERROR_CODES)[keyof typeof CHANNEL_EXPERIENCE_ERROR_CODES];

export class ChannelExperienceError extends Error {
  readonly code: ChannelExperienceErrorCode;
  readonly httpStatus: number;

  constructor(
    code: ChannelExperienceErrorCode,
    message?: string,
    httpStatus = 403
  ) {
    super(message ?? code);
    this.name = "ChannelExperienceError";
    this.code = code;
    this.httpStatus = httpStatus;
  }
}
