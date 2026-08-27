/**
 * Purpose:
 * IP-06 commercial resolution + immutable snapshot contract.
 *
 * Persistence decision:
 * Produces an application-level immutable value object (CommercialSnapshot).
 * No commercial_snapshot table — BP-006+ owns durable transactional storage.
 * Downstream consumers must store the snapshot payload with their transaction.
 *
 * Pipeline:
 * Auth → IP-09 pre-validate → IP-01 → IP-05 → (IP-03 tax) → (IP-04 adjustments)
 * → IP-02 → IP-06 → IP-09 post-validate → IP-07
 *
 * Implementation Package:
 * BP-005 / IP-06 – Commercial Resolution Snapshot & Transaction Contract
 * BP-005 / IP-07 – Expected Commercial Amount (projection after snapshot)
 * BP-005 / IP-09 – Commercial Validation & Resilience (fail-closed gates)
 */

import { randomUUID } from "node:crypto";

import type { CurrentBusinessContext } from "@/core/auth/types";

import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import { createAdjustmentAwareCommercialCompositionService } from "@/modules/commercial/services/commercial-adjustment-bridge";
import { createBasePriceResolutionService } from "@/modules/commercial/services/base-price-resolution-service";
import { createCommercialCompositionService } from "@/modules/commercial/services/commercial-composition-service";
import { createTaxAwareCommercialCompositionService } from "@/modules/commercial/services/tax-composition-bridge";
import {
  assertCommercialSnapshotValid,
  cloneCommercialResolution,
  computeCommercialIntegrityHash,
  reconcileResolutionPayable,
} from "@/modules/commercial/services/commercial-snapshot-rules";
import {
  createExpectedCommercialAmountService,
  ExpectedCommercialAmountService,
} from "@/modules/commercial/services/expected-commercial-amount-service";
import {
  CommercialValidationService,
  createCommercialValidationService,
} from "@/modules/commercial/services/commercial-validation-service";
import type {
  CommercialAdjustmentResolutionResult,
  CommercialResolution,
  CommercialResolutionRequest,
  CommercialSnapshot,
  ExpectedCommercialAmount,
  ResolvedCommercialComposition,
  TaxResolutionResult,
} from "@/modules/commercial/types";

const PAYMENT_NOTE =
  "Resolved payable is the authoritative commercial amount. Actual payment collected is out of scope for IP-06 (BP-007+).";

export class CommercialResolutionService {
  constructor(
    private readonly basePriceResolution = createBasePriceResolutionService(),
    private readonly compositionOnly = createCommercialCompositionService(),
    private readonly taxAware = createTaxAwareCommercialCompositionService(),
    private readonly adjustmentAware =
      createAdjustmentAwareCommercialCompositionService(),
    private readonly expectedAmountService: ExpectedCommercialAmountService =
      createExpectedCommercialAmountService(),
    private readonly validation: CommercialValidationService =
      createCommercialValidationService()
  ) {}

  /**
   * Resolve commercial terms now for the supplied context.
   * Fail closed on upstream IP-01/IP-05 conflict or missing price.
   * IP-09: pre/post validation — never invent a silent fallback payable.
   */
  async resolve(
    context: CurrentBusinessContext,
    request: CommercialResolutionRequest
  ): Promise<CommercialResolution> {
    this.assertRequest(context, request);
    this.validation.assertPreValidateResolve(context, request);

    let resolvedBasePrice;
    try {
      resolvedBasePrice = await this.basePriceResolution.resolveBasePrice(
        context,
        {
          businessId: request.businessId,
          offeringId: request.offeringId,
          currencyCode: request.currencyCode,
          quantity: request.quantity,
          partyId: request.partyId,
          customerSegment: request.customerSegment,
          salesChannel: request.salesChannel,
          region: request.region,
          pricingCatalogueId: request.pricingCatalogueId,
          effectiveAt: request.effectiveAt,
        }
      );
    } catch (error) {
      if (error instanceof CommercialError) {
        if (error.code === "MISSING_BASE_PRICE") {
          throw new CommercialError(
            "BASE_PRICE_UNAVAILABLE",
            COMMERCIAL_USER_MESSAGES.BASE_PRICE_UNAVAILABLE,
            404,
            "offeringId",
            error.details
          );
        }
        if (error.code === "BASE_PRICE_CONFLICT") {
          throw error;
        }
      }
      throw error;
    }

    const quantity =
      request.quantity == null || request.quantity === undefined
        ? 1
        : request.quantity;

    const taxRules = request.taxRules ?? [];
    const adjustmentRules = request.adjustmentRules ?? [];

    let composition: ResolvedCommercialComposition;
    let tax: TaxResolutionResult | null = null;
    let adjustments: CommercialAdjustmentResolutionResult | null = null;

    if (adjustmentRules.length > 0 || request.requireAdjustmentConfiguration) {
      const result = this.adjustmentAware.composeWithTaxAndAdjustments(
        context,
        {
          businessId: request.businessId,
          resolvedBasePrice,
          quantity,
          taxRules,
          adjustmentRules,
          requireTaxConfiguration: request.requireTaxConfiguration ?? false,
          requireAdjustmentConfiguration:
            request.requireAdjustmentConfiguration ?? false,
          allowNegativePayable: request.allowNegativePayable,
          customerSegment: request.customerSegment,
          salesChannel: request.salesChannel,
          region: request.region,
          presentationScale: request.presentationScale,
          roundingMode: request.roundingMode,
        }
      );
      composition = result.composition;
      tax = result.tax;
      adjustments = result.adjustments;
    } else if (taxRules.length > 0 || request.requireTaxConfiguration) {
      const result = this.taxAware.composeWithTax(context, {
        businessId: request.businessId,
        resolvedBasePrice,
        quantity,
        taxRules,
        requireTaxConfiguration: request.requireTaxConfiguration ?? false,
        customerSegment: request.customerSegment,
        salesChannel: request.salesChannel,
        region: request.region,
        presentationScale: request.presentationScale,
        roundingMode: request.roundingMode,
      });
      composition = result.composition;
      tax = result.tax;
    } else {
      composition = this.compositionOnly.compose(context, {
        businessId: request.businessId,
        resolvedBasePrice,
        quantity,
        presentationScale: request.presentationScale,
        roundingMode: request.roundingMode,
      });
    }

    const resolution: CommercialResolution = {
      resolutionId: randomUUID(),
      businessId: request.businessId,
      partyId: request.partyId ?? null,
      offeringId: resolvedBasePrice.offeringId,
      offeringCode: resolvedBasePrice.offeringCode,
      offeringName: resolvedBasePrice.offeringName,
      channel: request.salesChannel ?? resolvedBasePrice.salesChannel,
      catalogueId: resolvedBasePrice.pricingCatalogueId,
      catalogueCode: resolvedBasePrice.catalogueCode,
      currencyCode: resolvedBasePrice.currencyCode,
      quantity,
      effectiveAt: resolvedBasePrice.effectiveAt,
      resolvedAt: new Date().toISOString(),
      status: "RESOLVED",
      basePrice: {
        unitPrice: resolvedBasePrice.unitPrice,
        pricingItemId: resolvedBasePrice.pricingItemId,
        pricingCatalogueId: resolvedBasePrice.pricingCatalogueId,
        pricingMethod: resolvedBasePrice.pricingMethod,
        pricingMethodLabel: resolvedBasePrice.pricingMethodLabel,
      },
      components: composition.components.map((c) => ({
        componentId: c.componentId,
        componentType: c.componentTypeCode,
        componentCode: c.componentTypeCode,
        description: c.componentTypeLabel,
        amount: c.amount,
        amountNumber: c.amountNumber,
        currencyCode: c.currencyCode,
        rate: null,
        calculationBasis: c.calculationBasis,
        source: c.provenance.source,
        provenance: c.provenance,
      })),
      payable: composition.payableCandidate,
      payableNumber: composition.payableCandidateNumber,
      paymentCollected: null,
      paymentNote: PAYMENT_NOTE,
      provenance: {
        basePrice: resolvedBasePrice.provenance,
        taxRuleIds: taxRules.map((r) => r.taxRuleId),
        adjustmentRuleIds: adjustmentRules.map((r) => r.adjustmentRuleId),
        compositionReconciled: true,
        pipeline: "IP-01→IP-05→IP-03→IP-04→IP-02→IP-06",
      },
      resolvedBasePrice,
      composition,
      tax,
      adjustments,
    };

    try {
      reconcileResolutionPayable(resolution);
    } catch (error) {
      if (error instanceof CommercialError) {
        throw new CommercialError(
          "NO_COMMERCIAL_RESOLUTION",
          COMMERCIAL_USER_MESSAGES.NO_COMMERCIAL_RESOLUTION,
          error.statusCode,
          error.field,
          { cause: error.code, details: error.details }
        );
      }
      throw error;
    }

    // IP-09 post-validate: integrity / currency / reconcile — fail closed (no payable).
    this.validation.assertPostValidateResolution(resolution, {
      allowNegativePayable: request.allowNegativePayable,
    });

    return resolution;
  }

  /**
   * Explicitly request a new commercial result (same as resolve — named for clarity).
   * Never used implicitly to mutate an existing snapshot.
   */
  async reResolve(
    context: CurrentBusinessContext,
    request: CommercialResolutionRequest
  ): Promise<CommercialResolution> {
    return this.resolve(context, request);
  }

  /**
   * Freeze a resolution into an immutable snapshot value object.
   * Does not persist to database — caller/transaction owner retains the payload.
   */
  snapshot(resolution: CommercialResolution): CommercialSnapshot {
    reconcileResolutionPayable(resolution);
    const frozen = cloneCommercialResolution(resolution);
    const snap: CommercialSnapshot = {
      snapshotId: randomUUID(),
      businessId: frozen.businessId,
      frozenAt: new Date().toISOString(),
      integrityHash: computeCommercialIntegrityHash(frozen),
      immutable: true,
      resolution: frozen,
    };
    assertCommercialSnapshotValid(snap);
    return snap;
  }

  /**
   * Validate a consumer-held snapshot before use.
   */
  validateSnapshot(snapshot: CommercialSnapshot): CommercialSnapshot {
    assertCommercialSnapshotValid(snapshot);
    return snapshot;
  }

  /**
   * IP-07 — derive expected commercial amount from a frozen IP-06 snapshot.
   * Does not recalculate pricing/tax/discounts from masters.
   */
  calculateExpectedAmount(
    context: CurrentBusinessContext,
    snapshot: CommercialSnapshot
  ): ExpectedCommercialAmount {
    return this.expectedAmountService.calculateExpectedAmount(
      context,
      snapshot
    );
  }

  /**
   * Resolve → snapshot → expected amount (full commercial pipeline through IP-07).
   */
  async resolveExpectedAmount(
    context: CurrentBusinessContext,
    request: CommercialResolutionRequest
  ): Promise<{
    resolution: CommercialResolution;
    snapshot: CommercialSnapshot;
    expected: ExpectedCommercialAmount;
  }> {
    const resolution = await this.resolve(context, request);
    const snapshot = this.snapshot(resolution);
    const expected = this.calculateExpectedAmount(context, snapshot);
    return { resolution, snapshot, expected };
  }

  private assertRequest(
    context: CurrentBusinessContext,
    request: CommercialResolutionRequest
  ): void {
    if (!request.businessId?.trim()) {
      throw new CommercialError(
        "INVALID_CONTEXT",
        COMMERCIAL_USER_MESSAGES.INVALID_CONTEXT,
        400,
        "businessId"
      );
    }
    if (request.businessId !== context.businessId) {
      throw new CommercialError(
        "INVALID_CONTEXT",
        COMMERCIAL_USER_MESSAGES.INVALID_CONTEXT,
        403,
        "businessId"
      );
    }
    if (!request.offeringId?.trim()) {
      throw new CommercialError(
        "INVALID_CONTEXT",
        COMMERCIAL_USER_MESSAGES.INVALID_CONTEXT,
        400,
        "offeringId"
      );
    }
    if (!request.currencyCode?.trim()) {
      throw new CommercialError(
        "INVALID_CURRENCY",
        COMMERCIAL_USER_MESSAGES.INVALID_CURRENCY,
        400,
        "currencyCode"
      );
    }
  }
}

export function createCommercialResolutionService() {
  return new CommercialResolutionService();
}
