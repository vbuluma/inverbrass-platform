/**
 * Purpose:
 * End-to-end commercial pipeline: IP-01 base → IP-03 tax → IP-04 adjustments → IP-02 composition.
 *
 * Implementation Package:
 * BP-005 / IP-04 – Discounts & Commercial Adjustments
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  multiplyScaledByNumber,
  parseMoneyToScaled,
  scaledToString,
} from "@/modules/commercial/money/commercial-money";
import { createCommercialAdjustmentService } from "@/modules/commercial/services/commercial-adjustment-service";
import { createCommercialCompositionService } from "@/modules/commercial/services/commercial-composition-service";
import { createTaxResolutionService } from "@/modules/commercial/services/tax-resolution-service";
import type {
  CommercialAdjustmentResolutionResult,
  CommercialAdjustmentRuleConfiguration,
  CommercialCompositionRequest,
  ResolvedBasePrice,
  ResolvedCommercialComposition,
  TaxResolutionResult,
  TaxRuleConfiguration,
} from "@/modules/commercial/types";

export type ComposeWithTaxAndAdjustmentsRequest = {
  businessId: string;
  resolvedBasePrice: ResolvedBasePrice;
  quantity?: number | null;
  taxRules: TaxRuleConfiguration[];
  adjustmentRules?: CommercialAdjustmentRuleConfiguration[];
  requireTaxConfiguration?: boolean;
  requireAdjustmentConfiguration?: boolean;
  enforceApprovalThreshold?: boolean;
  allowNegativePayable?: boolean;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  jurisdictionCode?: string | null;
  presentationScale?: number;
  roundingMode?: CommercialCompositionRequest["roundingMode"];
  additionalComponents?: CommercialCompositionRequest["additionalComponents"];
};

export type ComposeWithTaxAndAdjustmentsResult = {
  tax: TaxResolutionResult;
  adjustments: CommercialAdjustmentResolutionResult;
  composition: ResolvedCommercialComposition;
};

export class AdjustmentAwareCommercialCompositionService {
  constructor(
    private readonly taxResolution = createTaxResolutionService(),
    private readonly adjustmentResolution = createCommercialAdjustmentService(),
    private readonly composition = createCommercialCompositionService()
  ) {}

  /**
   * IP-01 ResolvedBasePrice → IP-03 tax → IP-04 adjustments → IP-02 composition.
   */
  composeWithTaxAndAdjustments(
    context: CurrentBusinessContext,
    request: ComposeWithTaxAndAdjustmentsRequest
  ): ComposeWithTaxAndAdjustmentsResult {
    const quantity =
      request.quantity == null || request.quantity === undefined
        ? 1
        : request.quantity;

    const unit = parseMoneyToScaled(
      request.resolvedBasePrice.unitPrice,
      request.resolvedBasePrice.currencyCode,
      COMMERCIAL_INTERNAL_MONEY_SCALE
    );
    const grossOrPrincipalBase = multiplyScaledByNumber(unit, quantity);

    const tax = this.taxResolution.resolve(context, {
      businessId: request.businessId,
      currencyCode: request.resolvedBasePrice.currencyCode,
      baseAmount: scaledToString(grossOrPrincipalBase),
      effectiveAt: request.resolvedBasePrice.effectiveAt,
      taxRules: request.taxRules,
      offeringId: request.resolvedBasePrice.offeringId,
      customerSegment:
        request.customerSegment ?? request.resolvedBasePrice.customerSegment,
      salesChannel:
        request.salesChannel ?? request.resolvedBasePrice.salesChannel,
      region: request.region ?? request.resolvedBasePrice.region,
      jurisdictionCode: request.jurisdictionCode,
      requireTaxConfiguration: request.requireTaxConfiguration,
      presentationScale: request.presentationScale,
      roundingMode: request.roundingMode,
    });

    const principalAmount =
      tax.netPrincipalAmount ?? scaledToString(grossOrPrincipalBase);

    // Subtotal before adjustments = principal + tax magnitudes (exclusive path)
    const principalScaled = parseMoneyToScaled(
      principalAmount,
      request.resolvedBasePrice.currencyCode,
      COMMERCIAL_INTERNAL_MONEY_SCALE
    );
    const taxScaled = parseMoneyToScaled(
      tax.totalTaxAmount,
      request.resolvedBasePrice.currencyCode,
      COMMERCIAL_INTERNAL_MONEY_SCALE
    );
    const subtotalBeforeAdj = {
      units: principalScaled.units + taxScaled.units,
      scale: principalScaled.scale,
      currencyCode: principalScaled.currencyCode,
    };

    const adjustments = this.adjustmentResolution.resolve(context, {
      businessId: request.businessId,
      currencyCode: request.resolvedBasePrice.currencyCode,
      principalAmount,
      commercialSubtotalAmount: scaledToString(subtotalBeforeAdj),
      quantity,
      effectiveAt: request.resolvedBasePrice.effectiveAt,
      adjustmentRules: request.adjustmentRules ?? [],
      offeringId: request.resolvedBasePrice.offeringId,
      customerSegment:
        request.customerSegment ?? request.resolvedBasePrice.customerSegment,
      salesChannel:
        request.salesChannel ?? request.resolvedBasePrice.salesChannel,
      region: request.region ?? request.resolvedBasePrice.region,
      requireAdjustmentConfiguration: request.requireAdjustmentConfiguration,
      enforceApprovalThreshold: request.enforceApprovalThreshold,
      allowNegativePayable: request.allowNegativePayable,
      presentationScale: request.presentationScale,
      roundingMode: request.roundingMode,
    });

    const composition = this.composition.compose(context, {
      businessId: request.businessId,
      resolvedBasePrice: request.resolvedBasePrice,
      quantity,
      principalAmountOverride: tax.netPrincipalAmount,
      principalOverrideBasis: tax.netPrincipalAmount
        ? `IP-03 inclusive extraction — net principal from gross ${tax.grossAmount}`
        : null,
      additionalComponents: [
        ...tax.compositionContributions,
        ...adjustments.compositionContributions,
        ...(request.additionalComponents ?? []),
      ],
      presentationScale: request.presentationScale,
      roundingMode: request.roundingMode,
    });

    if (
      !request.allowNegativePayable &&
      composition.payableCandidateNumber < 0
    ) {
      throw new CommercialError(
        "PAYABLE_WOULD_BE_NEGATIVE",
        COMMERCIAL_USER_MESSAGES.PAYABLE_WOULD_BE_NEGATIVE,
        409,
        undefined,
        { payableCandidate: composition.payableCandidate }
      );
    }

    return { tax, adjustments, composition };
  }
}

export function createAdjustmentAwareCommercialCompositionService() {
  return new AdjustmentAwareCommercialCompositionService();
}
