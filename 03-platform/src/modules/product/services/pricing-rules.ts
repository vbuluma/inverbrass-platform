/**
 * Purpose:
 * Pure pricing business-rule helpers (no I/O).
 *
 * Implementation Package:
 * BP-003 / IP-011 – Offering Pricing & Pricing Rules
 */

import {
  PRICING_CATALOGUE_STATUS_CODES,
  PRICING_ITEM_STATUS_CODES,
  type PricingCatalogueStatusCode,
  type PricingItemStatusCode,
} from "@/modules/product/constants";

export type PricingDimensionKey = {
  offeringId: string;
  pricingCatalogueId: string;
  currencyCode: string;
  customerSegment: string | null;
  salesChannel: string | null;
  region: string | null;
  effectiveFrom: Date;
  effectiveTo: Date | null;
};

export function normalizePricingCode(code: string): string {
  return code.trim().toUpperCase();
}

export function normalizePricingDimension(value?: string | null): string | null {
  if (!value) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
}

export function buildPricingDimensionKey(input: {
  offeringId: string;
  pricingCatalogueId: string;
  currencyCode: string;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}): PricingDimensionKey {
  return {
    offeringId: input.offeringId,
    pricingCatalogueId: input.pricingCatalogueId,
    currencyCode: input.currencyCode.trim().toUpperCase(),
    customerSegment: normalizePricingDimension(input.customerSegment),
    salesChannel: normalizePricingDimension(input.salesChannel),
    region: normalizePricingDimension(input.region),
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null,
  };
}

export function dimensionKeysMatch(
  a: PricingDimensionKey,
  b: PricingDimensionKey
): boolean {
  return (
    a.offeringId === b.offeringId &&
    a.pricingCatalogueId === b.pricingCatalogueId &&
    a.currencyCode === b.currencyCode &&
    a.customerSegment === b.customerSegment &&
    a.salesChannel === b.salesChannel &&
    a.region === b.region
  );
}

export function periodsOverlap(
  aFrom: Date,
  aTo: Date | null,
  bFrom: Date,
  bTo: Date | null
): boolean {
  const aEnd = aTo ?? new Date("9999-12-31T23:59:59.999Z");
  const bEnd = bTo ?? new Date("9999-12-31T23:59:59.999Z");
  return aFrom <= bEnd && bFrom <= aEnd;
}

export function isPositivePrice(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

export function isValidPriceRange(
  unitPrice: number,
  minimumPrice?: number | null,
  maximumPrice?: number | null
): boolean {
  if (!isPositivePrice(unitPrice)) {
    return false;
  }
  if (minimumPrice != null && !isPositivePrice(minimumPrice)) {
    return false;
  }
  if (maximumPrice != null && !isPositivePrice(maximumPrice)) {
    return false;
  }
  if (
    minimumPrice != null &&
    maximumPrice != null &&
    maximumPrice < minimumPrice
  ) {
    return false;
  }
  if (minimumPrice != null && unitPrice < minimumPrice) {
    return false;
  }
  if (maximumPrice != null && unitPrice > maximumPrice) {
    return false;
  }
  return true;
}

export function isEffectivePeriodValid(
  effectiveFrom: Date,
  effectiveTo?: Date | null
): boolean {
  if (!effectiveTo) {
    return true;
  }
  return effectiveTo >= effectiveFrom;
}

export function isExpiredEffectiveDate(
  effectiveTo: Date | null | undefined,
  now: Date = new Date()
): boolean {
  if (!effectiveTo) {
    return false;
  }
  return effectiveTo < now;
}

export function isFutureEffectiveDate(
  effectiveFrom: Date,
  now: Date = new Date()
): boolean {
  return effectiveFrom > now;
}

export function isPricingItemEditable(status: PricingItemStatusCode): boolean {
  return status !== PRICING_ITEM_STATUS_CODES.EXPIRED &&
    status !== PRICING_ITEM_STATUS_CODES.ARCHIVED;
}

export function isPricingItemActiveNow(
  item: {
    status: string;
    effectiveFrom: Date;
    effectiveTo: Date | null;
  },
  now: Date = new Date()
): boolean {
  if (item.status !== PRICING_ITEM_STATUS_CODES.ACTIVE) {
    return false;
  }
  if (item.effectiveFrom > now) {
    return false;
  }
  if (item.effectiveTo && item.effectiveTo < now) {
    return false;
  }
  return true;
}

export function isPricingItemFuture(
  item: {
    status: string;
    effectiveFrom: Date;
  },
  now: Date = new Date()
): boolean {
  return (
    (item.status === PRICING_ITEM_STATUS_CODES.DRAFT ||
      item.status === PRICING_ITEM_STATUS_CODES.ACTIVE) &&
    item.effectiveFrom > now
  );
}

export function isPricingItemExpired(
  item: {
    status: string;
    effectiveTo: Date | null;
  },
  now: Date = new Date()
): boolean {
  if (item.status === PRICING_ITEM_STATUS_CODES.EXPIRED) {
    return true;
  }
  if (item.status === PRICING_ITEM_STATUS_CODES.ARCHIVED) {
    return false;
  }
  return item.effectiveTo != null && item.effectiveTo < now;
}

export function canTransitionPricingCatalogueStatus(
  current: PricingCatalogueStatusCode,
  next: PricingCatalogueStatusCode
): boolean {
  if (current === next) {
    return true;
  }
  if (current === PRICING_CATALOGUE_STATUS_CODES.ARCHIVED) {
    return false;
  }
  if (next === PRICING_CATALOGUE_STATUS_CODES.ACTIVE) {
    return (
      current === PRICING_CATALOGUE_STATUS_CODES.DRAFT ||
      current === PRICING_CATALOGUE_STATUS_CODES.SUSPENDED
    );
  }
  if (next === PRICING_CATALOGUE_STATUS_CODES.SUSPENDED) {
    return current === PRICING_CATALOGUE_STATUS_CODES.ACTIVE;
  }
  if (next === PRICING_CATALOGUE_STATUS_CODES.ARCHIVED) {
    return (
      current === PRICING_CATALOGUE_STATUS_CODES.DRAFT ||
      current === PRICING_CATALOGUE_STATUS_CODES.ACTIVE ||
      current === PRICING_CATALOGUE_STATUS_CODES.SUSPENDED
    );
  }
  return false;
}

export function canTransitionPricingItemStatus(
  current: PricingItemStatusCode,
  next: PricingItemStatusCode
): boolean {
  if (current === next) {
    return true;
  }
  if (
    current === PRICING_ITEM_STATUS_CODES.EXPIRED ||
    current === PRICING_ITEM_STATUS_CODES.ARCHIVED
  ) {
    return false;
  }
  if (next === PRICING_ITEM_STATUS_CODES.ACTIVE) {
    return current === PRICING_ITEM_STATUS_CODES.DRAFT;
  }
  if (next === PRICING_ITEM_STATUS_CODES.EXPIRED) {
    return (
      current === PRICING_ITEM_STATUS_CODES.DRAFT ||
      current === PRICING_ITEM_STATUS_CODES.ACTIVE
    );
  }
  if (next === PRICING_ITEM_STATUS_CODES.ARCHIVED) {
    return (
      current === PRICING_ITEM_STATUS_CODES.DRAFT ||
      current === PRICING_ITEM_STATUS_CODES.ACTIVE ||
      current === PRICING_ITEM_STATUS_CODES.EXPIRED
    );
  }
  return false;
}

export function resolveDefaultPricingItemStatus(): PricingItemStatusCode {
  return PRICING_ITEM_STATUS_CODES.DRAFT;
}

export function resolveDefaultPricingCatalogueStatus(): PricingCatalogueStatusCode {
  return PRICING_CATALOGUE_STATUS_CODES.DRAFT;
}

export function pricingItemStatusLabel(status: string): string {
  switch (status) {
    case PRICING_ITEM_STATUS_CODES.DRAFT:
      return "Draft";
    case PRICING_ITEM_STATUS_CODES.ACTIVE:
      return "Active";
    case PRICING_ITEM_STATUS_CODES.EXPIRED:
      return "Expired";
    case PRICING_ITEM_STATUS_CODES.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

export function pricingCatalogueStatusLabel(status: string): string {
  switch (status) {
    case PRICING_CATALOGUE_STATUS_CODES.DRAFT:
      return "Draft";
    case PRICING_CATALOGUE_STATUS_CODES.ACTIVE:
      return "Active";
    case PRICING_CATALOGUE_STATUS_CODES.SUSPENDED:
      return "Suspended";
    case PRICING_CATALOGUE_STATUS_CODES.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

export function formatPriceAmount(value: string | number): string {
  const numeric = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(numeric)) {
    return String(value);
  }
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  });
}
