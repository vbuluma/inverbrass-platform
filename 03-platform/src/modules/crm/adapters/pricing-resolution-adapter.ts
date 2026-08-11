/**
 * Purpose:
 * Resolves offering unit prices from BP-003 Pricing for quotation line entry.
 *
 * Architecture:
 * QuotationService → PricingResolutionAdapter → PricingService (BP-003)
 *
 * Design rationale:
 * Price retrieval is isolated from quotation total calculations
 * (QuotationCalculationService).
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.2)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { normalizePricingDimension } from "@/modules/product/services/pricing-rules";
import { createPricingService } from "@/modules/product/services/pricing-service";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { PRODUCT_STATUS_CODES } from "@/modules/product/constants";
import { CrmError, CRM_USER_MESSAGES } from "@/modules/crm/errors";
import type {
  PricingResolutionRequest,
  ResolvedOfferingPrice,
} from "@/modules/crm/quotation/types";
import type { PricingItemView } from "@/modules/product/types";

function scorePricingCandidate(
  item: PricingItemView,
  request: PricingResolutionRequest
): number {
  let score = 0;

  if (item.isActiveNow) {
    score += 100;
  }

  if (
    request.pricingCatalogueId &&
    item.pricingCatalogueId === request.pricingCatalogueId
  ) {
    score += 50;
  }

  score += scoreDimensionMatch(
    item.customerSegment,
    request.customerSegment ?? null
  );
  score += scoreDimensionMatch(item.salesChannel, request.salesChannel ?? null);
  score += scoreDimensionMatch(item.region, request.region ?? null);

  return score;
}

function scoreDimensionMatch(
  itemValue: string | null,
  requestValue: string | null
): number {
  const normalizedItem = normalizePricingDimension(itemValue);
  const normalizedRequest = normalizePricingDimension(requestValue);

  if (normalizedRequest == null) {
    return normalizedItem == null ? 5 : 2;
  }

  if (normalizedItem === normalizedRequest) {
    return 20;
  }

  if (normalizedItem == null) {
    return 8;
  }

  return 0;
}

function toResolvedOfferingPrice(item: PricingItemView): ResolvedOfferingPrice {
  return {
    offeringId: item.offeringId,
    offeringCode: item.offeringCode,
    offeringName: item.offeringName,
    pricingItemId: item.id,
    pricingCatalogueId: item.pricingCatalogueId,
    catalogueCode: item.catalogueCode,
    catalogueName: item.catalogueName,
    unitPrice: Number(item.unitPrice),
    currencyCode: item.currencyCode,
    pricingMethod: item.pricingMethod,
    customerSegment: item.customerSegment,
    salesChannel: item.salesChannel,
    region: item.region,
    effectiveFrom: item.effectiveFrom,
    effectiveTo: item.effectiveTo,
    resolvedAt: new Date().toISOString(),
  };
}

export class PricingResolutionAdapter {
  constructor(
    private readonly pricingService = createPricingService(),
    private readonly productRepository = createProductRepository()
  ) {}

  async resolveUnitPrice(
    context: CurrentBusinessContext,
    request: PricingResolutionRequest
  ): Promise<ResolvedOfferingPrice> {
    await this.assertOfferingQuotable(context, request.offeringId);

    const candidates = await this.pricingService.searchPriceItems(context, {
      offeringId: request.offeringId,
      pricingCatalogueId: request.pricingCatalogueId,
      currencyCode: request.currencyCode,
      customerSegment: request.customerSegment ?? undefined,
      salesChannel: request.salesChannel ?? undefined,
      region: request.region ?? undefined,
    });

    const asOf = request.asOfDate ?? new Date();
    const activeCandidates = candidates.filter((item) => {
      if (!item.isActiveNow) {
        return false;
      }
      const effectiveFrom = new Date(item.effectiveFrom);
      const effectiveTo = item.effectiveTo ? new Date(item.effectiveTo) : null;
      if (effectiveFrom > asOf) {
        return false;
      }
      if (effectiveTo && effectiveTo < asOf) {
        return false;
      }
      return true;
    });

    if (activeCandidates.length === 0) {
      throw new CrmError(
        "PRICE_NOT_FOUND",
        CRM_USER_MESSAGES.PRICE_NOT_FOUND,
        404
      );
    }

    const ranked = activeCandidates
      .map((item) => ({
        item,
        score: scorePricingCandidate(item, request),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        return (
          new Date(b.item.effectiveFrom).getTime() -
          new Date(a.item.effectiveFrom).getTime()
        );
      });

    const best = ranked[0]?.item;
    if (!best || ranked[0]?.score <= 0) {
      throw new CrmError(
        "PRICE_NOT_FOUND",
        CRM_USER_MESSAGES.PRICE_NOT_FOUND,
        404
      );
    }

    return toResolvedOfferingPrice(best);
  }

  async resolveUnitPrices(
    context: CurrentBusinessContext,
    requests: PricingResolutionRequest[]
  ): Promise<ResolvedOfferingPrice[]> {
    return Promise.all(
      requests.map((request) => this.resolveUnitPrice(context, request))
    );
  }

  private async assertOfferingQuotable(
    context: CurrentBusinessContext,
    offeringId: string
  ): Promise<void> {
    const offering = await this.productRepository.findById(
      context.businessId,
      offeringId
    );

    if (!offering) {
      throw new CrmError(
        "OFFERING_NOT_FOUND",
        CRM_USER_MESSAGES.OFFERING_NOT_FOUND,
        404
      );
    }

    if (
      !offering.isSellable ||
      !offering.isActive ||
      offering.statusCode !== PRODUCT_STATUS_CODES.ACTIVE
    ) {
      throw new CrmError(
        "OFFERING_NOT_SELLABLE",
        CRM_USER_MESSAGES.OFFERING_NOT_SELLABLE,
        409
      );
    }
  }
}

export function createPricingResolutionAdapter() {
  return new PricingResolutionAdapter();
}
