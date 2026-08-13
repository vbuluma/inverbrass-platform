/**
 * Purpose:
 * BP-005 IP-01 orchestrator — consume BP-003 prices, identify candidates,
 * delegate winner selection to authoritative IP-05 precedence engine.
 *
 * Implementation Package:
 * BP-005 / IP-01 – Base Price Consumption & Applicable Selection
 * BP-005 / IP-05 – Pricing Precedence (winner selection owner)
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

import { createBp003PricingReadAdapter } from "@/modules/commercial/adapters/bp003-pricing-read-adapter";
import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  filterApplicableCandidates,
  noteUnsupportedDimensions,
  resolveEffectiveAt,
} from "@/modules/commercial/services/base-price-candidate-rules";
import {
  createIp05BasePricePrecedenceResolver,
  type BasePricePrecedencePort,
} from "@/modules/commercial/services/ip05-base-price-precedence-port";
import type {
  BasePriceResolutionRequest,
  IdentifyBasePriceCandidatesResult,
  ResolvedBasePrice,
} from "@/modules/commercial/types";

function assertRequest(
  request: BasePriceResolutionRequest,
  context: CurrentBusinessContext
): void {
  if (!request.businessId) {
    throw new CommercialError(
      "INVALID_INPUT",
      "businessId is required for base-price resolution.",
      400,
      "businessId"
    );
  }
  if (request.businessId !== context.businessId) {
    throw new CommercialError(
      "INVALID_INPUT",
      "Resolution businessId must match the authenticated business context.",
      400,
      "businessId"
    );
  }
  if (!request.offeringId) {
    throw new CommercialError(
      "INVALID_INPUT",
      "offeringId is required for base-price resolution.",
      400,
      "offeringId"
    );
  }
  if (!request.currencyCode?.trim()) {
    throw new CommercialError(
      "INVALID_INPUT",
      "currencyCode is required for base-price resolution.",
      400,
      "currencyCode"
    );
  }
}

export class BasePriceResolutionService {
  constructor(
    private readonly pricingRead = createBp003PricingReadAdapter(),
    private readonly precedencePort: BasePricePrecedencePort = createIp05BasePricePrecedenceResolver()
  ) {}

  /**
   * Identify applicable BP-003 candidates only (no winner selection).
   * Eligibility / lifecycle / effective dating live here; IP-05 owns precedence.
   */
  async identifyCandidates(
    context: CurrentBusinessContext,
    request: BasePriceResolutionRequest
  ): Promise<IdentifyBasePriceCandidatesResult> {
    assertRequest(request, context);

    const effectiveAt = resolveEffectiveAt(request.effectiveAt);
    const rawItems = await this.pricingRead.loadActivePriceItems(
      context,
      request.offeringId
    );

    const candidates = filterApplicableCandidates(
      rawItems,
      request,
      effectiveAt
    );

    return {
      effectiveAt,
      candidates,
      unsupportedDimensionsNoted: noteUnsupportedDimensions(request),
    };
  }

  /**
   * Full IP-01 resolution: candidates → IP-05 → ResolvedBasePrice.
   */
  async resolveBasePrice(
    context: CurrentBusinessContext,
    request: BasePriceResolutionRequest
  ): Promise<ResolvedBasePrice> {
    const identified = await this.identifyCandidates(context, request);

    const precedence = this.precedencePort.resolveWinner({
      request,
      effectiveAt: identified.effectiveAt,
      candidates: identified.candidates,
    });

    if (precedence.outcome === "MISSING") {
      throw new CommercialError(
        "MISSING_BASE_PRICE",
        COMMERCIAL_USER_MESSAGES.MISSING_BASE_PRICE,
        404,
        undefined,
        {
          resolutionCode: precedence.resolutionCode,
          offeringId: request.offeringId,
          currencyCode: request.currencyCode,
          effectiveAt: identified.effectiveAt.toISOString(),
          candidateCount: 0,
          precedenceOwner: "IP-05",
          explanation: precedence.explanation,
        }
      );
    }

    if (precedence.outcome === "CONFLICT") {
      throw new CommercialError(
        "BASE_PRICE_CONFLICT",
        COMMERCIAL_USER_MESSAGES.BASE_PRICE_CONFLICT,
        409,
        undefined,
        {
          resolutionCode: precedence.resolutionCode,
          offeringId: request.offeringId,
          currencyCode: request.currencyCode,
          effectiveAt: identified.effectiveAt.toISOString(),
          candidateCount: precedence.candidates.length,
          tiedPricingItemIds: precedence.tied.map((c) => c.pricingItemId),
          candidatePricingItemIds: precedence.candidates.map(
            (c) => c.pricingItemId
          ),
          conflictingCatalogues: precedence.tied.map((c) => ({
            pricingItemId: c.pricingItemId,
            pricingCatalogueId: c.pricingCatalogueId,
            catalogueCode: c.catalogueCode,
            unitPrice: c.unitPrice,
          })),
          precedenceOwner: "IP-05",
          precedenceStage: precedence.explanation.precedenceStage,
          conflictReason: precedence.explanation.conflictReason,
          explanation: precedence.explanation,
        }
      );
    }

    const winner = precedence.winner;
    const effectiveAtIso = identified.effectiveAt.toISOString();

    return {
      unitPrice: winner.unitPrice,
      currencyCode: winner.currencyCode,
      pricingMethod: winner.pricingMethod,
      pricingMethodLabel: winner.pricingMethodLabel,
      pricingCatalogueId: winner.pricingCatalogueId,
      catalogueCode: winner.catalogueCode,
      catalogueName: winner.catalogueName,
      pricingItemId: winner.pricingItemId,
      offeringId: winner.offeringId,
      offeringCode: winner.offeringCode,
      offeringName: winner.offeringName,
      effectiveFrom: winner.effectiveFrom,
      effectiveTo: winner.effectiveTo,
      effectiveAt: effectiveAtIso,
      minimumPrice: winner.minimumPrice,
      maximumPrice: winner.maximumPrice,
      customerSegment: winner.customerSegment,
      salesChannel: winner.salesChannel,
      region: winner.region,
      provenance: {
        businessId: context.businessId,
        offeringId: winner.offeringId,
        effectiveAt: effectiveAtIso,
        pricingCatalogueId: winner.pricingCatalogueId,
        catalogueCode: winner.catalogueCode,
        catalogueName: winner.catalogueName,
        pricingItemId: winner.pricingItemId,
        pricingMethod: winner.pricingMethod,
        pricingMethodLabel: winner.pricingMethodLabel,
        dimensions: {
          currencyCode: request.currencyCode,
          customerSegment: request.customerSegment ?? null,
          salesChannel: request.salesChannel ?? null,
          region: request.region ?? null,
          pricingCatalogueId: request.pricingCatalogueId ?? null,
          partyId: request.partyId ?? null,
          quantity: request.quantity ?? null,
        },
        candidateCount: identified.candidates.length,
        precedenceOwner: "IP-05",
        selectionMode: precedence.selectionMode,
        precedenceDecision: precedence.explanation,
        unsupportedDimensionsNoted: identified.unsupportedDimensionsNoted,
      },
      resolvedAt: new Date().toISOString(),
    };
  }
}

export function createBasePriceResolutionService(
  precedencePort?: BasePricePrecedencePort
) {
  return new BasePriceResolutionService(
    createBp003PricingReadAdapter(),
    precedencePort ?? createIp05BasePricePrecedenceResolver()
  );
}
