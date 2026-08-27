/**
 * Purpose:
 * Bridge IP-01 → IP-02 → IP-03: resolve tax and compose commercial components.
 * Never bypasses IP-01 for base price; never queries pricing_item.
 *
 * Implementation Package:
 * BP-005 / IP-03 – Tax Rules & Calculation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

import { createCommercialCompositionService } from "@/modules/commercial/services/commercial-composition-service";
import { createTaxResolutionService } from "@/modules/commercial/services/tax-resolution-service";
import {
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  multiplyScaledByNumber,
  parseMoneyToScaled,
  scaledToString,
} from "@/modules/commercial/money/commercial-money";
import type {
  CommercialCompositionRequest,
  ResolvedBasePrice,
  ResolvedCommercialComposition,
  TaxResolutionRequest,
  TaxResolutionResult,
  TaxRuleConfiguration,
} from "@/modules/commercial/types";

export type ComposeWithTaxRequest = {
  businessId: string;
  resolvedBasePrice: ResolvedBasePrice;
  quantity?: number | null;
  taxRules: TaxRuleConfiguration[];
  requireTaxConfiguration?: boolean;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  jurisdictionCode?: string | null;
  presentationScale?: number;
  roundingMode?: CommercialCompositionRequest["roundingMode"];
  /** Extra non-tax components (e.g. future IP-04). */
  additionalComponents?: CommercialCompositionRequest["additionalComponents"];
};

export type ComposeWithTaxResult = {
  tax: TaxResolutionResult;
  composition: ResolvedCommercialComposition;
};

export class TaxAwareCommercialCompositionService {
  constructor(
    private readonly taxResolution = createTaxResolutionService(),
    private readonly composition = createCommercialCompositionService()
  ) {}

  /**
   * IP-01 ResolvedBasePrice → IP-03 tax → IP-02 composition.
   */
  composeWithTax(
    context: CurrentBusinessContext,
    request: ComposeWithTaxRequest
  ): ComposeWithTaxResult {
    const quantity =
      request.quantity == null || request.quantity === undefined
        ? 1
        : request.quantity;

    const unit = parseMoneyToScaled(
      request.resolvedBasePrice.unitPrice,
      request.resolvedBasePrice.currencyCode,
      COMMERCIAL_INTERNAL_MONEY_SCALE
    );
    const baseAmount = multiplyScaledByNumber(unit, quantity);

    const taxRequest: TaxResolutionRequest = {
      businessId: request.businessId,
      currencyCode: request.resolvedBasePrice.currencyCode,
      baseAmount: scaledToString(baseAmount),
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
    };

    const tax = this.taxResolution.resolve(context, taxRequest);

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
        ...(request.additionalComponents ?? []),
      ],
      presentationScale: request.presentationScale,
      roundingMode: request.roundingMode,
    });

    return { tax, composition };
  }
}

export function createTaxAwareCommercialCompositionService() {
  return new TaxAwareCommercialCompositionService();
}
