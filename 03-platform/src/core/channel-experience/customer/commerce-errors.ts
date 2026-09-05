/**
 * Purpose:
 * SL-CUS-001 — Customer commerce orchestration errors.
 */

export const CUSTOMER_COMMERCE_ERROR_CODES = {
  PRICE_CHANGED: "PRICE_CHANGED",
  AVAILABILITY_CHANGED: "AVAILABILITY_CHANGED",
  CART_EMPTY: "CART_EMPTY",
  OFFERING_NOT_FOUND: "OFFERING_NOT_FOUND",
  CHECKOUT_FAILED: "CHECKOUT_FAILED",
  PAYMENT_METHOD_UNAVAILABLE: "PAYMENT_METHOD_UNAVAILABLE",
  /** SL-CUS-005 — obligation missing / unauthorized / unsettled path denied */
  OBLIGATION_NOT_AVAILABLE: "OBLIGATION_NOT_AVAILABLE",
  /** SL-CUS-005 — zero/negative/over-outstanding/malformed amount */
  PAYMENT_AMOUNT_INVALID: "PAYMENT_AMOUNT_INVALID",
  /** SL-CUS-005 — obligation already fully paid */
  PAYMENT_ALREADY_SETTLED: "PAYMENT_ALREADY_SETTLED",
  /** SL-CUS-005 — initiation rejected by BP-007 / provider path */
  PAYMENT_FAILED: "PAYMENT_FAILED",
} as const;

export type CustomerCommerceErrorCode =
  (typeof CUSTOMER_COMMERCE_ERROR_CODES)[keyof typeof CUSTOMER_COMMERCE_ERROR_CODES];

export class CustomerCommerceError extends Error {
  readonly code: CustomerCommerceErrorCode;
  readonly httpStatus: number;
  /** Safe diagnostic class for cert/logs — never credentials or PII. */
  readonly underlyingKind?: string;
  /** Safe domain/DB error code when available. */
  readonly underlyingCode?: string;

  constructor(
    code: CustomerCommerceErrorCode,
    message: string,
    httpStatus = 400,
    diagnostics?: { underlyingKind?: string; underlyingCode?: string }
  ) {
    super(message);
    this.name = "CustomerCommerceError";
    this.code = code;
    this.httpStatus = httpStatus;
    this.underlyingKind = diagnostics?.underlyingKind;
    this.underlyingCode = diagnostics?.underlyingCode;
  }
}
