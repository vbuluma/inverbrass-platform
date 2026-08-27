/**
 * Purpose:
 * Pure business rules for Product Bundles Engine (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-006 – Bundles & Packages Engine
 */

import {
  BUNDLE_STATUS_CODES,
  BUNDLE_TYPE_CODES,
  BUNDLE_TYPE_LABELS,
  PRODUCT_STATUS_CODES,
  type BundleStatusCode,
  type BundleTypeCode,
} from "@/modules/product/constants";

export function normalizeBundleCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "_");
}

export function resolveDefaultBundleStatus(): BundleStatusCode {
  return BUNDLE_STATUS_CODES.DRAFT;
}

export function bundleStatusLabel(status: string): string {
  switch (status) {
    case BUNDLE_STATUS_CODES.DRAFT:
      return "Draft";
    case BUNDLE_STATUS_CODES.ACTIVE:
      return "Active";
    case BUNDLE_STATUS_CODES.SUSPENDED:
      return "Suspended";
    case BUNDLE_STATUS_CODES.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

export function bundleTypeLabel(type: string): string {
  if (type in BUNDLE_TYPE_LABELS) {
    return BUNDLE_TYPE_LABELS[type as BundleTypeCode];
  }
  return type;
}

export function isBundleEditable(status: string): boolean {
  return status !== BUNDLE_STATUS_CODES.ARCHIVED;
}

export function canTransitionBundleStatus(current: string, next: string): boolean {
  if (current === next) {
    return true;
  }
  if (current === BUNDLE_STATUS_CODES.ARCHIVED) {
    return false;
  }
  if (next === BUNDLE_STATUS_CODES.DRAFT) {
    return current === BUNDLE_STATUS_CODES.DRAFT;
  }
  return true;
}

export function isProductBundleable(statusCode: string): boolean {
  return statusCode === PRODUCT_STATUS_CODES.ACTIVE;
}

export function isValidBundleType(type: string): type is BundleTypeCode {
  return Object.values(BUNDLE_TYPE_CODES).includes(type as BundleTypeCode);
}

export type BundleItemInput = {
  productId: string;
  variantId?: string | null;
  quantity: number;
  mandatory?: boolean;
  displayOrder?: number;
};

export function buildBundleItemKey(productId: string, variantId?: string | null): string {
  return `${productId}:${variantId ?? "none"}`;
}

export function findDuplicateBundleItemKeys(items: BundleItemInput[]): string | null {
  const seen = new Set<string>();
  for (const item of items) {
    const key = buildBundleItemKey(item.productId, item.variantId);
    if (seen.has(key)) {
      return key;
    }
    seen.add(key);
  }
  return null;
}

export function bundleTypeOptions() {
  return Object.values(BUNDLE_TYPE_CODES).map((code) => ({
    code,
    label: BUNDLE_TYPE_LABELS[code],
  }));
}
