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
  CLASSIFICATION_NOT_FOUND: "CLASSIFICATION_NOT_FOUND",
  DUPLICATE_CLASSIFICATION_CODE: "DUPLICATE_CLASSIFICATION_CODE",
  CIRCULAR_CLASSIFICATION_HIERARCHY: "CIRCULAR_CLASSIFICATION_HIERARCHY",
  CLASSIFICATION_HAS_ACTIVE_CHILDREN: "CLASSIFICATION_HAS_ACTIVE_CHILDREN",
  CLASSIFICATION_HAS_ACTIVE_PRODUCTS: "CLASSIFICATION_HAS_ACTIVE_PRODUCTS",
  INACTIVE_CLASSIFICATION: "INACTIVE_CLASSIFICATION",
  DUPLICATE_CLASSIFICATION_ASSIGNMENT: "DUPLICATE_CLASSIFICATION_ASSIGNMENT",
  ASSIGNMENT_NOT_FOUND: "ASSIGNMENT_NOT_FOUND",
  PRIMARY_CLASSIFICATION_REQUIRED: "PRIMARY_CLASSIFICATION_REQUIRED",
  UNIT_NOT_FOUND: "UNIT_NOT_FOUND",
  UNIT_CATEGORY_NOT_FOUND: "UNIT_CATEGORY_NOT_FOUND",
  DUPLICATE_UNIT_CODE: "DUPLICATE_UNIT_CODE",
  DUPLICATE_UNIT_SYMBOL: "DUPLICATE_UNIT_SYMBOL",
  INVALID_CONVERSION_FACTOR: "INVALID_CONVERSION_FACTOR",
  UNIT_CATEGORY_MISMATCH: "UNIT_CATEGORY_MISMATCH",
  MULTIPLE_BASE_UNITS: "MULTIPLE_BASE_UNITS",
  ARCHIVED_UNIT_IMMUTABLE: "ARCHIVED_UNIT_IMMUTABLE",
  INVALID_UNIT_STATUS_TRANSITION: "INVALID_UNIT_STATUS_TRANSITION",
  PRICING_CATALOGUE_NOT_FOUND: "PRICING_CATALOGUE_NOT_FOUND",
  PRICING_ITEM_NOT_FOUND: "PRICING_ITEM_NOT_FOUND",
  DUPLICATE_PRICING_CATALOGUE_CODE: "DUPLICATE_PRICING_CATALOGUE_CODE",
  DUPLICATE_ACTIVE_PRICING: "DUPLICATE_ACTIVE_PRICING",
  OVERLAPPING_PRICING_PERIOD: "OVERLAPPING_PRICING_PERIOD",
  INVALID_PRICING_METHOD: "INVALID_PRICING_METHOD",
  INVALID_PRICING_STATUS_TRANSITION: "INVALID_PRICING_STATUS_TRANSITION",
  EXPIRED_PRICING_IMMUTABLE: "EXPIRED_PRICING_IMMUTABLE",
  INVALID_PRICE_RANGE: "INVALID_PRICE_RANGE",
  INVALID_EFFECTIVE_PERIOD: "INVALID_EFFECTIVE_PERIOD",
  METRIC_DEFINITION_NOT_FOUND: "METRIC_DEFINITION_NOT_FOUND",
  ANALYTICS_READ_ONLY: "ANALYTICS_READ_ONLY",
  SNAPSHOT_ALREADY_EXISTS: "SNAPSHOT_ALREADY_EXISTS",
  GOVERNANCE_NOT_FOUND: "GOVERNANCE_NOT_FOUND",
  GOVERNANCE_IMMUTABLE: "GOVERNANCE_IMMUTABLE",
  GOVERNANCE_LOCKED: "GOVERNANCE_LOCKED",
  BUSINESS_OWNER_REQUIRED: "BUSINESS_OWNER_REQUIRED",
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
  CLASSIFICATION_NOT_FOUND: "Classification not found.",
  DUPLICATE_CLASSIFICATION_CODE: "A classification with this code already exists.",
  CIRCULAR_CLASSIFICATION_HIERARCHY:
    "This move would create a circular hierarchy.",
  CLASSIFICATION_HAS_ACTIVE_CHILDREN:
    "Cannot deactivate a classification that has active child nodes.",
  CLASSIFICATION_HAS_ACTIVE_PRODUCTS:
    "Cannot deactivate a classification with assigned active products.",
  INACTIVE_CLASSIFICATION:
    "Only active catalogue nodes can receive new products.",
  DUPLICATE_CLASSIFICATION_ASSIGNMENT:
    "This product is already assigned to this classification.",
  ASSIGNMENT_NOT_FOUND: "Classification assignment not found.",
  PRIMARY_CLASSIFICATION_REQUIRED:
    "Exactly one primary classification is required when assignments exist.",
  UNIT_NOT_FOUND: "Unit of measure not found.",
  UNIT_CATEGORY_NOT_FOUND: "Unit category not found.",
  DUPLICATE_UNIT_CODE: "A unit with this code already exists.",
  DUPLICATE_UNIT_SYMBOL: "This symbol is already used in the selected category.",
  INVALID_CONVERSION_FACTOR: "Conversion factor must be greater than zero.",
  UNIT_CATEGORY_MISMATCH: "Conversion is only allowed within the same category.",
  MULTIPLE_BASE_UNITS: "Only one base unit is allowed per category.",
  ARCHIVED_UNIT_IMMUTABLE: "Archived units cannot be modified.",
  INVALID_UNIT_STATUS_TRANSITION: "This status change is not allowed.",
  PRICING_CATALOGUE_NOT_FOUND: "Pricing catalogue not found.",
  PRICING_ITEM_NOT_FOUND: "Price record not found.",
  DUPLICATE_PRICING_CATALOGUE_CODE:
    "A pricing catalogue with this code already exists.",
  DUPLICATE_ACTIVE_PRICING:
    "An active price already exists for this offering and dimension combination.",
  OVERLAPPING_PRICING_PERIOD:
    "This price overlaps an existing active price for the same dimensions.",
  INVALID_PRICING_METHOD: "Selected pricing method is not valid.",
  INVALID_PRICING_STATUS_TRANSITION: "This pricing status change is not allowed.",
  EXPIRED_PRICING_IMMUTABLE: "Expired prices cannot be modified.",
  INVALID_PRICE_RANGE: "Price range is not valid.",
  INVALID_EFFECTIVE_PERIOD: "Effective period is not valid.",
  METRIC_DEFINITION_NOT_FOUND: "Metric definition not found.",
  ANALYTICS_READ_ONLY: "Analytics snapshots are read-only.",
  SNAPSHOT_ALREADY_EXISTS: "A snapshot already exists for this metric and period.",
  GOVERNANCE_NOT_FOUND: "Governance record not found.",
  GOVERNANCE_IMMUTABLE: "Archived offerings cannot modify governance.",
  GOVERNANCE_LOCKED: "Governance is locked and cannot be changed.",
  BUSINESS_OWNER_REQUIRED: "A Responsible Business Owner is required.",
} as const;
