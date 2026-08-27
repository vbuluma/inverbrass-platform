/**
 * Purpose:
 * Pure business rules for Product Variants Engine (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-005 – Product Variants Engine
 */

import {
  PRODUCT_STATUS_CODES,
  VARIANT_STATUS_CODES,
  type VariantStatusCode,
} from "@/modules/product/constants";

export function normalizeVariantCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "_");
}

export function resolveDefaultVariantStatus(): VariantStatusCode {
  return VARIANT_STATUS_CODES.DRAFT;
}

export function variantStatusLabel(status: string): string {
  switch (status) {
    case VARIANT_STATUS_CODES.DRAFT:
      return "Draft";
    case VARIANT_STATUS_CODES.ACTIVE:
      return "Active";
    case VARIANT_STATUS_CODES.SUSPENDED:
      return "Suspended";
    case VARIANT_STATUS_CODES.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

export function isVariantEditable(status: string): boolean {
  return status !== VARIANT_STATUS_CODES.ARCHIVED;
}

export function isVariantTransactable(status: string): boolean {
  return status === VARIANT_STATUS_CODES.ACTIVE;
}

export function canTransitionVariantStatus(
  current: string,
  next: string
): boolean {
  if (current === next) {
    return true;
  }
  if (current === VARIANT_STATUS_CODES.ARCHIVED) {
    return false;
  }
  if (next === VARIANT_STATUS_CODES.DRAFT) {
    return current === VARIANT_STATUS_CODES.DRAFT;
  }
  return true;
}

export function isParentProductAvailableForVariants(
  productStatusCode: string
): boolean {
  return productStatusCode !== PRODUCT_STATUS_CODES.ARCHIVED;
}

export type VariantAttributePair = {
  attributeDefinitionId: string;
  value: unknown;
};

export function buildCombinationFingerprint(
  attributes: VariantAttributePair[]
): string | null {
  if (attributes.length === 0) {
    return null;
  }

  const normalized = attributes
    .filter((item) => item.value !== null && item.value !== undefined && item.value !== "")
    .map((item) => ({
      attributeDefinitionId: item.attributeDefinitionId,
      value: item.value,
    }))
    .sort((a, b) =>
      a.attributeDefinitionId.localeCompare(b.attributeDefinitionId)
    );

  if (normalized.length === 0) {
    return null;
  }

  return JSON.stringify(normalized);
}

export function hasDistinguishingAttributes(
  attributes: VariantAttributePair[]
): boolean {
  return attributes.some(
    (item) =>
      item.value !== null &&
      item.value !== undefined &&
      item.value !== "" &&
      !(Array.isArray(item.value) && item.value.length === 0)
  );
}

export function buildCloneVariantCode(sourceCode: string): string {
  const base = sourceCode.replace(/_COPY\d*$/i, "");
  return `${base}_COPY`;
}

export function buildCloneVariantName(sourceName: string): string {
  return `${sourceName} (Copy)`;
}
