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
  INVALID_LIFECYCLE_TRANSITION: "INVALID_LIFECYCLE_TRANSITION",
  INVALID_EFFECTIVE_DATES: "INVALID_EFFECTIVE_DATES",
  MAX_ACTIVE_VERSIONS_EXCEEDED: "MAX_ACTIVE_VERSIONS_EXCEEDED",
  SELF_REPLACEMENT_NOT_ALLOWED: "SELF_REPLACEMENT_NOT_ALLOWED",
  LIFECYCLE_NOT_FOUND: "LIFECYCLE_NOT_FOUND",
  DUPLICATE_OFFERING_RELATIONSHIP: "DUPLICATE_OFFERING_RELATIONSHIP",
  SELF_RELATIONSHIP_NOT_ALLOWED: "SELF_RELATIONSHIP_NOT_ALLOWED",
  CIRCULAR_DEPENDENCY: "CIRCULAR_DEPENDENCY",
  OFFERING_RELATIONSHIP_NOT_FOUND: "OFFERING_RELATIONSHIP_NOT_FOUND",
  OFFERING_DOCUMENT_NOT_FOUND: "OFFERING_DOCUMENT_NOT_FOUND",
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
  INVALID_LIFECYCLE_TRANSITION: "This lifecycle action is not allowed.",
  INVALID_EFFECTIVE_DATES: "Effective From must be before Effective To.",
  MAX_ACTIVE_VERSIONS_EXCEEDED: "Maximum number of active versions reached.",
  SELF_REPLACEMENT_NOT_ALLOWED: "A product cannot replace itself.",
  LIFECYCLE_NOT_FOUND: "Product lifecycle record not found.",
  DUPLICATE_OFFERING_RELATIONSHIP: "This relationship already exists.",
  SELF_RELATIONSHIP_NOT_ALLOWED: "An offering cannot relate to itself.",
  CIRCULAR_DEPENDENCY: "This relationship would create a circular dependency.",
  OFFERING_RELATIONSHIP_NOT_FOUND: "Relationship not found.",
  OFFERING_DOCUMENT_NOT_FOUND: "Document not found.",
} as const;
