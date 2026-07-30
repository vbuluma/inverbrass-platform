/**
 * Purpose:
 * Industry Experience product type visibility — static profile until ENG-003k metadata ships.
 *
 * Design rationale:
 * Same Product/Offering Engine; Industry Experience decides which types appear in UI.
 * Falls back to full catalogue when industry is unknown.
 *
 * Implementation Package:
 * BP-003 / IP-001 – Product & Service Foundation
 */

import { PRODUCT_TYPE_CODES } from "@/modules/product/constants";

const ALL_PRODUCT_TYPE_CODES = Object.values(PRODUCT_TYPE_CODES);

/** Industry code → allowed product_type codes for registration and filters. */
export const INDUSTRY_PRODUCT_TYPE_PROFILES: Record<string, readonly string[]> = {
  FINANCIAL: [
    PRODUCT_TYPE_CODES.LOAN_PRODUCT,
    PRODUCT_TYPE_CODES.SUBSCRIPTION,
    PRODUCT_TYPE_CODES.SERVICE,
    PRODUCT_TYPE_CODES.MEMBERSHIP,
    PRODUCT_TYPE_CODES.INSURANCE,
    PRODUCT_TYPE_CODES.OTHER,
  ],
  HEALTHCARE: [
    PRODUCT_TYPE_CODES.SERVICE,
    PRODUCT_TYPE_CODES.INSURANCE,
    PRODUCT_TYPE_CODES.SUBSCRIPTION,
    PRODUCT_TYPE_CODES.MEMBERSHIP,
    PRODUCT_TYPE_CODES.OTHER,
  ],
  EDUCATION: [
    PRODUCT_TYPE_CODES.COURSE,
    PRODUCT_TYPE_CODES.SERVICE,
    PRODUCT_TYPE_CODES.SUBSCRIPTION,
    PRODUCT_TYPE_CODES.MEMBERSHIP,
    PRODUCT_TYPE_CODES.DIGITAL_PRODUCT,
    PRODUCT_TYPE_CODES.OTHER,
  ],
  PROPERTY: [
    PRODUCT_TYPE_CODES.PROPERTY,
    PRODUCT_TYPE_CODES.RENTAL_ASSET,
    PRODUCT_TYPE_CODES.SERVICE,
    PRODUCT_TYPE_CODES.OTHER,
  ],
  HOSPITALITY: [
    PRODUCT_TYPE_CODES.PROPERTY,
    PRODUCT_TYPE_CODES.SERVICE,
    PRODUCT_TYPE_CODES.SUBSCRIPTION,
    PRODUCT_TYPE_CODES.RENTAL_ASSET,
    PRODUCT_TYPE_CODES.OTHER,
  ],
  COMMERCE: [
    PRODUCT_TYPE_CODES.PHYSICAL_PRODUCT,
    PRODUCT_TYPE_CODES.SERVICE,
    PRODUCT_TYPE_CODES.DIGITAL_PRODUCT,
    PRODUCT_TYPE_CODES.SUBSCRIPTION,
    PRODUCT_TYPE_CODES.OTHER,
  ],
  AGRICULTURE: [
    PRODUCT_TYPE_CODES.PHYSICAL_PRODUCT,
    PRODUCT_TYPE_CODES.SERVICE,
    PRODUCT_TYPE_CODES.RENTAL_ASSET,
    PRODUCT_TYPE_CODES.OTHER,
  ],
  TRANSPORT: [
    PRODUCT_TYPE_CODES.RENTAL_ASSET,
    PRODUCT_TYPE_CODES.SERVICE,
    PRODUCT_TYPE_CODES.SUBSCRIPTION,
    PRODUCT_TYPE_CODES.OTHER,
  ],
  MANUFACTURING: [
    PRODUCT_TYPE_CODES.PHYSICAL_PRODUCT,
    PRODUCT_TYPE_CODES.SERVICE,
    PRODUCT_TYPE_CODES.OTHER,
  ],
  PROFESSIONAL: [
    PRODUCT_TYPE_CODES.SERVICE,
    PRODUCT_TYPE_CODES.SUBSCRIPTION,
    PRODUCT_TYPE_CODES.DIGITAL_PRODUCT,
    PRODUCT_TYPE_CODES.OTHER,
  ],
};

export function filterProductTypesForIndustry<T extends { code: string }>(
  productTypes: T[],
  industryCode: string | null | undefined
): T[] {
  if (!industryCode) {
    return productTypes;
  }

  const allowed = INDUSTRY_PRODUCT_TYPE_PROFILES[industryCode];
  if (!allowed || allowed.length === 0) {
    return productTypes;
  }

  const allowedSet = new Set<string>(allowed);
  const filtered = productTypes.filter((type) => allowedSet.has(type.code));

  return filtered.length > 0 ? filtered : productTypes;
}

export function listAllProductTypeCodes(): readonly string[] {
  return ALL_PRODUCT_TYPE_CODES;
}
