/**
 * Purpose:
 * Pure IP-01 candidate identification rules (no I/O).
 *
 * Separates applicability filtering from IP-05 precedence/conflict arbitration.
 *
 * Implementation Package:
 * BP-005 / IP-01 – Base Price Consumption & Applicable Selection
 */

import {
  PRICING_CATALOGUE_STATUS_CODES,
  PRICING_ITEM_STATUS_CODES,
} from "@/modules/product/constants";
import { normalizePricingDimension } from "@/modules/product/services/pricing-rules";

import {
  BP003_UNSUPPORTED_PRICE_DIMENSIONS,
} from "@/modules/commercial/constants";
import type {
  BasePriceCandidate,
  BasePriceResolutionRequest,
} from "@/modules/commercial/types";

export type RawPriceItemForCandidate = {
  id: string;
  offeringId: string;
  offeringCode: string;
  offeringName: string;
  pricingCatalogueId: string;
  catalogueCode: string;
  catalogueName: string;
  catalogueStatus: string;
  currencyCode: string;
  unitPrice: string | number;
  minimumPrice: string | number | null;
  maximumPrice: string | number | null;
  pricingMethod: string;
  pricingMethodLabel: string;
  customerSegment: string | null;
  salesChannel: string | null;
  region: string | null;
  effectiveFrom: string | Date;
  effectiveTo: string | Date | null;
  status: string;
};

export function resolveEffectiveAt(
  value?: Date | string | null,
  now: Date = new Date()
): Date {
  if (value == null) {
    return now;
  }
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return now;
  }
  return parsed;
}

export function isItemLifecycleApplicable(status: string): boolean {
  return status === PRICING_ITEM_STATUS_CODES.ACTIVE;
}

export function isCatalogueLifecycleApplicable(status: string): boolean {
  return status === PRICING_CATALOGUE_STATUS_CODES.ACTIVE;
}

export function isEffectiveAtInWindow(
  effectiveFrom: Date,
  effectiveTo: Date | null,
  asAt: Date
): boolean {
  if (effectiveFrom > asAt) {
    return false;
  }
  if (effectiveTo && effectiveTo < asAt) {
    return false;
  }
  return true;
}

/**
 * Dimension applicability:
 * - Request value set → item null (wildcard) OR exact match
 * - Request value unset → do not invent a filter (all item values remain eligible)
 */
export function dimensionApplies(
  itemValue: string | null | undefined,
  requestValue: string | null | undefined
): boolean {
  const normalizedRequest = normalizePricingDimension(requestValue);
  if (normalizedRequest == null) {
    return true;
  }
  const normalizedItem = normalizePricingDimension(itemValue);
  if (normalizedItem == null) {
    return true;
  }
  return normalizedItem === normalizedRequest;
}

export function currencyApplies(
  itemCurrency: string,
  requestCurrency: string
): boolean {
  return (
    itemCurrency.trim().toUpperCase() === requestCurrency.trim().toUpperCase()
  );
}

export function catalogueIdApplies(
  itemCatalogueId: string,
  requestCatalogueId?: string | null
): boolean {
  if (!requestCatalogueId) {
    return true;
  }
  return itemCatalogueId === requestCatalogueId;
}

export function noteUnsupportedDimensions(
  request: Pick<BasePriceResolutionRequest, "quantity" | "partyId">
): string[] {
  const noted: string[] = [];
  if (request.quantity != null) {
    noted.push("quantity");
  }
  if (request.partyId) {
    noted.push("partyId");
  }
  return noted.filter((d) =>
    (BP003_UNSUPPORTED_PRICE_DIMENSIONS as readonly string[]).includes(d)
  );
}

export function toBasePriceCandidate(
  item: RawPriceItemForCandidate
): BasePriceCandidate {
  return {
    pricingItemId: item.id,
    offeringId: item.offeringId,
    offeringCode: item.offeringCode,
    offeringName: item.offeringName,
    pricingCatalogueId: item.pricingCatalogueId,
    catalogueCode: item.catalogueCode,
    catalogueName: item.catalogueName,
    catalogueStatus: item.catalogueStatus,
    currencyCode: item.currencyCode,
    unitPrice: Number(item.unitPrice),
    minimumPrice:
      item.minimumPrice == null ? null : Number(item.minimumPrice),
    maximumPrice:
      item.maximumPrice == null ? null : Number(item.maximumPrice),
    pricingMethod: item.pricingMethod,
    pricingMethodLabel: item.pricingMethodLabel,
    customerSegment: item.customerSegment,
    salesChannel: item.salesChannel,
    region: item.region,
    effectiveFrom:
      item.effectiveFrom instanceof Date
        ? item.effectiveFrom.toISOString()
        : item.effectiveFrom,
    effectiveTo:
      item.effectiveTo == null
        ? null
        : item.effectiveTo instanceof Date
          ? item.effectiveTo.toISOString()
          : item.effectiveTo,
    status: item.status,
  };
}

export function filterApplicableCandidates(
  items: RawPriceItemForCandidate[],
  request: Pick<
    BasePriceResolutionRequest,
    | "currencyCode"
    | "pricingCatalogueId"
    | "customerSegment"
    | "salesChannel"
    | "region"
  >,
  effectiveAt: Date
): BasePriceCandidate[] {
  return items
    .filter((item) => {
      if (!isItemLifecycleApplicable(item.status)) {
        return false;
      }
      if (!isCatalogueLifecycleApplicable(item.catalogueStatus)) {
        return false;
      }
      const from =
        item.effectiveFrom instanceof Date
          ? item.effectiveFrom
          : new Date(item.effectiveFrom);
      const to =
        item.effectiveTo == null
          ? null
          : item.effectiveTo instanceof Date
            ? item.effectiveTo
            : new Date(item.effectiveTo);
      if (!isEffectiveAtInWindow(from, to, effectiveAt)) {
        return false;
      }
      if (!currencyApplies(item.currencyCode, request.currencyCode)) {
        return false;
      }
      if (!catalogueIdApplies(item.pricingCatalogueId, request.pricingCatalogueId)) {
        return false;
      }
      if (!dimensionApplies(item.customerSegment, request.customerSegment)) {
        return false;
      }
      if (!dimensionApplies(item.salesChannel, request.salesChannel)) {
        return false;
      }
      if (!dimensionApplies(item.region, request.region)) {
        return false;
      }
      return true;
    })
    .map(toBasePriceCandidate);
}

/**
 * @deprecated Prefer `basePriceSpecificityScore` from pricing-precedence-rules (IP-05).
 * Re-exported here so IP-01 candidate-rules consumers keep a single import path.
 */
export { interimSpecificityScore, basePriceSpecificityScore } from "@/modules/commercial/services/pricing-precedence-rules";

