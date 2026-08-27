/**
 * Purpose:
 * Read-only adapter over BP-003 IP-011 pricing — no master duplication.
 *
 * Implementation Package:
 * BP-005 / IP-01 – Base Price Consumption & Applicable Selection
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import { PRICING_ITEM_STATUS_CODES } from "@/modules/product/constants";
import { createPricingCatalogueRepository } from "@/modules/product/repositories/pricing-catalogue-repository";
import { createPricingService } from "@/modules/product/services/pricing-service";
import type { PricingItemView } from "@/modules/product/types";

import type { RawPriceItemForCandidate } from "@/modules/commercial/services/base-price-candidate-rules";

export class Bp003PricingReadAdapter {
  constructor(
    private readonly pricingService = createPricingService(),
    private readonly catalogueRepository = createPricingCatalogueRepository()
  ) {}

  /**
   * Load ACTIVE price items for an offering within the business.
   * Dimension/wildcard filtering is performed by IP-01 candidate rules,
   * not by exact equality search (so null wildcards remain eligible).
   */
  async loadActivePriceItems(
    context: CurrentBusinessContext,
    offeringId: string
  ): Promise<RawPriceItemForCandidate[]> {
    const items = await this.pricingService.searchPriceItems(context, {
      offeringId,
      status: PRICING_ITEM_STATUS_CODES.ACTIVE,
    });

    const catalogueStatusById = new Map<string, string>();

    const enriched: RawPriceItemForCandidate[] = [];
    for (const item of items) {
      const catalogueStatus = await this.resolveCatalogueStatus(
        context.businessId,
        item,
        catalogueStatusById
      );
      enriched.push({
        id: item.id,
        offeringId: item.offeringId,
        offeringCode: item.offeringCode,
        offeringName: item.offeringName,
        pricingCatalogueId: item.pricingCatalogueId,
        catalogueCode: item.catalogueCode,
        catalogueName: item.catalogueName,
        catalogueStatus,
        currencyCode: item.currencyCode,
        unitPrice: item.unitPrice,
        minimumPrice: item.minimumPrice,
        maximumPrice: item.maximumPrice,
        pricingMethod: item.pricingMethod,
        pricingMethodLabel: item.pricingMethodLabel,
        customerSegment: item.customerSegment,
        salesChannel: item.salesChannel,
        region: item.region,
        effectiveFrom: item.effectiveFrom,
        effectiveTo: item.effectiveTo,
        status: item.status,
      });
    }

    return enriched;
  }

  private async resolveCatalogueStatus(
    businessId: string,
    item: PricingItemView,
    cache: Map<string, string>
  ): Promise<string> {
    const cached = cache.get(item.pricingCatalogueId);
    if (cached) {
      return cached;
    }

    const catalogue = await this.catalogueRepository.findById(
      businessId,
      item.pricingCatalogueId
    );
    const status = catalogue?.status ?? "UNKNOWN";
    cache.set(item.pricingCatalogueId, status);
    return status;
  }
}

export function createBp003PricingReadAdapter() {
  return new Bp003PricingReadAdapter();
}
