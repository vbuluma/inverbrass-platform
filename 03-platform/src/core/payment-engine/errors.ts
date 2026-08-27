/**
 * Purpose:
 * ENG-006 Payment Engine errors. Messages stay business-facing.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

export const PAYMENT_ENGINE_ERROR_CODES = {
  EXECUTION_NOT_AVAILABLE: "EXECUTION_NOT_AVAILABLE",
  CAPABILITY_NOT_FOUND: "CAPABILITY_NOT_FOUND",
  PAYMENT_PROVIDER_REJECTED: "PAYMENT_PROVIDER_REJECTED",
  PAYMENT_TIMEOUT: "PAYMENT_TIMEOUT",
  PAYMENT_UNKNOWN: "PAYMENT_UNKNOWN",
} as const;

export type PaymentEngineErrorCode =
  (typeof PAYMENT_ENGINE_ERROR_CODES)[keyof typeof PAYMENT_ENGINE_ERROR_CODES];

export class PaymentEngineError extends Error {
  readonly code: PaymentEngineErrorCode;
  readonly statusCode: number;

  constructor(
    code: PaymentEngineErrorCode,
    message: string,
    statusCode = 409
  ) {
    super(message);
    this.name = "PaymentEngineError";
    this.code = code;
    this.statusCode = statusCode;
  }
}
