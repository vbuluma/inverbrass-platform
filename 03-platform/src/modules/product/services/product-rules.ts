/**
 * Purpose:
 * Pure Product Foundation business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import {
  PRODUCT_RECORD_SOURCE_CODES,
  PRODUCT_STATUS_CODES,
  type ProductRecordSourceCode,
  type ProductStatusCode,
} from "@/modules/product/constants";

export function resolveDefaultProductStatus(): ProductStatusCode {
  return PRODUCT_STATUS_CODES.DRAFT;
}

export function isProductStatusCode(value: string): value is ProductStatusCode {
  return (
    value === PRODUCT_STATUS_CODES.DRAFT ||
    value === PRODUCT_STATUS_CODES.ACTIVE ||
    value === PRODUCT_STATUS_CODES.SUSPENDED ||
    value === PRODUCT_STATUS_CODES.DISCONTINUED ||
    value === PRODUCT_STATUS_CODES.ARCHIVED
  );
}

export function isProductRecordSourceCode(
  value: string
): value is ProductRecordSourceCode {
  return (
    value === PRODUCT_RECORD_SOURCE_CODES.MIGRATED ||
    value === PRODUCT_RECORD_SOURCE_CODES.PLATFORM_CREATED ||
    value === PRODUCT_RECORD_SOURCE_CODES.API
  );
}

export function canTransitionProductStatus(
  current: ProductStatusCode,
  next: ProductStatusCode
): boolean {
  if (current === next) {
    return true;
  }

  if (current === PRODUCT_STATUS_CODES.ARCHIVED) {
    return false;
  }

  if (next === PRODUCT_STATUS_CODES.ACTIVE) {
    return (
      current === PRODUCT_STATUS_CODES.DRAFT ||
      current === PRODUCT_STATUS_CODES.SUSPENDED ||
      current === PRODUCT_STATUS_CODES.DISCONTINUED
    );
  }

  if (next === PRODUCT_STATUS_CODES.SUSPENDED) {
    return current === PRODUCT_STATUS_CODES.ACTIVE;
  }

  if (next === PRODUCT_STATUS_CODES.DISCONTINUED) {
    return (
      current === PRODUCT_STATUS_CODES.ACTIVE ||
      current === PRODUCT_STATUS_CODES.SUSPENDED
    );
  }

  if (next === PRODUCT_STATUS_CODES.ARCHIVED) {
    return (
      current === PRODUCT_STATUS_CODES.DRAFT ||
      current === PRODUCT_STATUS_CODES.ACTIVE ||
      current === PRODUCT_STATUS_CODES.SUSPENDED ||
      current === PRODUCT_STATUS_CODES.DISCONTINUED
    );
  }

  if (next === PRODUCT_STATUS_CODES.DRAFT) {
    return current === PRODUCT_STATUS_CODES.DRAFT;
  }

  return false;
}

export function isProductEditable(statusCode: ProductStatusCode): boolean {
  return statusCode !== PRODUCT_STATUS_CODES.ARCHIVED;
}

export function normalizeProductCode(code: string): string {
  return code.trim().toUpperCase();
}

export function recordSourceLabel(code: string): string {
  switch (code) {
    case PRODUCT_RECORD_SOURCE_CODES.MIGRATED:
      return "Migrated";
    case PRODUCT_RECORD_SOURCE_CODES.API:
      return "API";
    case PRODUCT_RECORD_SOURCE_CODES.PLATFORM_CREATED:
    default:
      return "Platform Created";
  }
}
