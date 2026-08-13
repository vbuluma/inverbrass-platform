/**
 * Purpose:
 * Resolves offering unit prices and full commercial snapshots via BP-005.
 *
 * Architecture:
 * QuotationService → PricingResolutionAdapter
 *   → unit price: BasePriceResolutionService (IP-01 → IP-05 → BP-003)
 *   → commercial: CommercialResolutionService (IP-01→05→03→04→02→IP-06)
 *
 * CRM must not score prices locally or query pricing_item directly.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.2)
 * Consumer of BP-005 / IP-01 + IP-05 + IP-06
 */

import type { CurrentBusinessContext } from "@/core/auth/types";
import {
  CommercialError,
  createBasePriceResolutionService,
  createCommercialResolutionService,
  type CommercialResolutionRequest,
  type CommercialSnapshot,
} from "@/modules/commercial";
import { PRODUCT_STATUS_CODES } from "@/modules/product/constants";
import { createProductRepository } from "@/modules/product/repositories/product-repository";
import { CrmError, CRM_USER_MESSAGES } from "@/modules/crm/errors";
import type {
  PricingResolutionRequest,
  ResolvedOfferingPrice,
} from "@/modules/crm/quotation/types";

export class PricingResolutionAdapter {
  constructor(
    private readonly basePriceResolution = createBasePriceResolutionService(),
    private readonly commercialResolution = createCommercialResolutionService(),
    private readonly productRepository = createProductRepository()
  ) {}

  async resolveUnitPrice(
    context: CurrentBusinessContext,
    request: PricingResolutionRequest
  ): Promise<ResolvedOfferingPrice> {
    await this.assertOfferingQuotable(context, request.offeringId);

    try {
      const resolved = await this.basePriceResolution.resolveBasePrice(
        context,
        {
          businessId: context.businessId,
          offeringId: request.offeringId,
          currencyCode: request.currencyCode,
          pricingCatalogueId: request.pricingCatalogueId,
          customerSegment: request.customerSegment,
          salesChannel: request.salesChannel,
          region: request.region,
          effectiveAt: request.asOfDate,
        }
      );

      return {
        offeringId: resolved.offeringId,
        offeringCode: resolved.offeringCode,
        offeringName: resolved.offeringName,
        pricingItemId: resolved.pricingItemId,
        pricingCatalogueId: resolved.pricingCatalogueId,
        catalogueCode: resolved.catalogueCode,
        catalogueName: resolved.catalogueName,
        unitPrice: resolved.unitPrice,
        currencyCode: resolved.currencyCode,
        pricingMethod: resolved.pricingMethod,
        customerSegment: resolved.customerSegment,
        salesChannel: resolved.salesChannel,
        region: resolved.region,
        effectiveFrom: resolved.effectiveFrom,
        effectiveTo: resolved.effectiveTo,
        resolvedAt: resolved.resolvedAt,
      };
    } catch (error) {
      this.rethrowCommercialAsCrm(error);
    }
  }

  /**
   * Full commercial resolution + immutable snapshot via IP-06.
   * Prefer this when quotations/orders need authoritative payable + components.
   */
  async resolveCommercialSnapshot(
    context: CurrentBusinessContext,
    request: Omit<CommercialResolutionRequest, "businessId"> & {
      businessId?: string;
    }
  ): Promise<CommercialSnapshot> {
    await this.assertOfferingQuotable(context, request.offeringId);

    try {
      const resolution = await this.commercialResolution.resolve(context, {
        ...request,
        businessId: context.businessId,
      });
      return this.commercialResolution.snapshot(resolution);
    } catch (error) {
      this.rethrowCommercialAsCrm(error);
    }
  }

  async resolveUnitPrices(
    context: CurrentBusinessContext,
    requests: PricingResolutionRequest[]
  ): Promise<ResolvedOfferingPrice[]> {
    return Promise.all(
      requests.map((request) => this.resolveUnitPrice(context, request))
    );
  }

  private rethrowCommercialAsCrm(error: unknown): never {
    if (error instanceof CommercialError) {
      if (
        error.code === "MISSING_BASE_PRICE" ||
        error.code === "BASE_PRICE_UNAVAILABLE"
      ) {
        throw new CrmError(
          "PRICE_NOT_FOUND",
          CRM_USER_MESSAGES.PRICE_NOT_FOUND,
          404
        );
      }
      if (error.code === "BASE_PRICE_CONFLICT") {
        throw new CrmError(
          "PRICE_NOT_FOUND",
          CRM_USER_MESSAGES.PRICE_NOT_FOUND,
          409
        );
      }
      throw new CrmError(
        "INVALID_INPUT",
        error.message,
        error.statusCode,
        error.field
      );
    }
    throw error;
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
