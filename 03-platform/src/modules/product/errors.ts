/**
 * Purpose:
 * Typed errors for Product Foundation operations.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

export const PRODUCT_ERROR_CODES = {
  INVALID_INPUT: "INVALID_INPUT",
  SESSION_REQUIRED: "SESSION_REQUIRED",
  BUSINESS_CONTEXT_REQUIRED: "BUSINESS_CONTEXT_REQUIRED",
  PRODUCT_NOT_FOUND: "PRODUCT_NOT_FOUND",
  DUPLICATE_PRODUCT_CODE: "DUPLICATE_PRODUCT_CODE",
  INVALID_PRODUCT_TYPE: "INVALID_PRODUCT_TYPE",
  INVALID_STATUS_TRANSITION: "INVALID_STATUS_TRANSITION",
  ARCHIVED_PRODUCT_IMMUTABLE: "ARCHIVED_PRODUCT_IMMUTABLE",
  REFERENCE_DATA_MISSING: "REFERENCE_DATA_MISSING",
  OWNER_PARTY_NOT_FOUND: "OWNER_PARTY_NOT_FOUND",
  PROVIDER_ERROR: "PROVIDER_ERROR",
} as const;

export type ProductErrorCode =
  (typeof PRODUCT_ERROR_CODES)[keyof typeof PRODUCT_ERROR_CODES];

export class ProductError extends Error {
  readonly code: ProductErrorCode;
  readonly statusCode: number;
  readonly field?: string;

  constructor(
    code: ProductErrorCode,
    message: string,
    statusCode: number,
    field?: string
  ) {
    super(message);
    this.name = "ProductError";
    this.code = code;
    this.statusCode = statusCode;
    this.field = field;
  }
}

export const PRODUCT_USER_MESSAGES = {
  INVALID_INPUT: "Please check the product details and try again.",
  PRODUCT_NOT_FOUND: "Product not found.",
  DUPLICATE_PRODUCT_CODE: "A product with this code already exists.",
  INVALID_PRODUCT_TYPE: "Selected product type is not valid.",
  INVALID_STATUS_TRANSITION: "This status change is not allowed.",
  ARCHIVED_PRODUCT_IMMUTABLE: "Archived products cannot be modified.",
  REFERENCE_DATA_MISSING:
    "Product reference catalogues are not available. Contact your administrator.",
  OWNER_PARTY_NOT_FOUND: "Selected product owner was not found.",
} as const;
