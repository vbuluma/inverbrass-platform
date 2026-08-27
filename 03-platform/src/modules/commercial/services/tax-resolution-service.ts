/**
 * Purpose:
 * Resolve applicable tax rules and emit tax components for IP-02 composition.
 * Does not own base price (IP-01) or composition (IP-02).
 * Does not persist tax masters (not yet in-repo).
 *
 * Implementation Package:
 * BP-005 / IP-03 – Tax Rules & Calculation
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

import {
  COMMERCIAL_COMPONENT_TYPE_CODES,
  COMMERCIAL_IP,
  EXAMPLE_TAX_TYPE_CODES,
  TAX_TREATMENT_CODES,
} from "@/modules/commercial/constants";
import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  COMMERCIAL_DEFAULT_PRESENTATION_SCALE,
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  parseMoneyToScaled,
  roundScaledToPresentation,
  scaledToNumber,
  scaledToString,
  zeroScaled,
  type CommercialRoundingMode,
} from "@/modules/commercial/money/commercial-money";
import {
  filterApplicableTaxRules,
  selectTaxRulesForResolution,
} from "@/modules/commercial/services/tax-applicability-rules";
import { calculateTaxAmount } from "@/modules/commercial/services/tax-calculation-rules";
import type {
  CommercialComponentContribution,
  ResolvedTaxComponent,
  TaxResolutionRequest,
  TaxResolutionResult,
} from "@/modules/commercial/types";

export class TaxResolutionService {
  resolve(
    context: CurrentBusinessContext,
    request: TaxResolutionRequest
  ): TaxResolutionResult {
    if (!request.businessId) {
      throw new CommercialError(
        "INVALID_INPUT",
        "businessId is required for tax resolution.",
        400,
        "businessId"
      );
    }
    if (request.businessId !== context.businessId) {
      throw new CommercialError(
        "BUSINESS_CONTEXT_MISMATCH",
        COMMERCIAL_USER_MESSAGES.BUSINESS_CONTEXT_MISMATCH,
        403,
        "businessId"
      );
    }
    if (!request.currencyCode?.trim()) {
      throw new CommercialError(
        "INVALID_INPUT",
        "currencyCode is required for tax resolution.",
        400,
        "currencyCode"
      );
    }

    const currencyCode = request.currencyCode.trim().toUpperCase();
    const roundingMode: CommercialRoundingMode =
      request.roundingMode ?? "HALF_UP";
    const presentationScale =
      request.presentationScale ?? COMMERCIAL_DEFAULT_PRESENTATION_SCALE;
    const requireTax = request.requireTaxConfiguration !== false;

    const applicability = filterApplicableTaxRules(request.taxRules, {
      businessId: request.businessId,
      currencyCode,
      offeringId: request.offeringId,
      customerSegment: request.customerSegment,
      salesChannel: request.salesChannel,
      region: request.region,
      jurisdictionCode: request.jurisdictionCode,
      effectiveAt: request.effectiveAt,
    });

    const selection = selectTaxRulesForResolution(
      applicability.candidates,
      {
        businessId: request.businessId,
        currencyCode,
        offeringId: request.offeringId,
        customerSegment: request.customerSegment,
        salesChannel: request.salesChannel,
        region: request.region,
        jurisdictionCode: request.jurisdictionCode,
        effectiveAt: request.effectiveAt,
      }
    );

    if (selection.outcome === "MISSING") {
      if (requireTax) {
        throw new CommercialError(
          "TAX_CONFIGURATION_MISSING",
          COMMERCIAL_USER_MESSAGES.TAX_CONFIGURATION_MISSING,
          404,
          undefined,
          {
            businessId: request.businessId,
            effectiveAt: applicability.effectiveAt.toISOString(),
          }
        );
      }
      const base = parseMoneyToScaled(
        request.baseAmount,
        currencyCode,
        COMMERCIAL_INTERNAL_MONEY_SCALE
      );
      const presentedBase = roundScaledToPresentation(
        base,
        presentationScale,
        roundingMode
      );
      return {
        businessId: request.businessId,
        currencyCode,
        effectiveAt: applicability.effectiveAt.toISOString(),
        treatment: TAX_TREATMENT_CODES.EXEMPT,
        taxComponents: [],
        netPrincipalAmount: null,
        grossAmount: scaledToString(presentedBase),
        totalTaxAmount: scaledToString(
          zeroScaled(currencyCode, presentationScale)
        ),
        totalTaxAmountNumber: 0,
        compositionContributions: [],
      };
    }

    if (selection.outcome === "CONFLICT") {
      throw new CommercialError(
        "TAX_CONFIGURATION_CONFLICT",
        COMMERCIAL_USER_MESSAGES.TAX_CONFIGURATION_CONFLICT,
        409,
        undefined,
        {
          taxTypeCode: selection.taxTypeCode,
          tiedTaxRuleIds: selection.tied.map((r) => r.taxRuleId),
          precedenceOwner: COMMERCIAL_IP.IP_05_PRECEDENCE,
        }
      );
    }

    const effectiveAtIso = applicability.effectiveAt.toISOString();
    const resolvedAt = new Date().toISOString();
    const taxComponents: ResolvedTaxComponent[] = [];
    const contributions: CommercialComponentContribution[] = [];

    let totalTax = zeroScaled(currencyCode, COMMERCIAL_INTERNAL_MONEY_SCALE);
    let netPrincipalFromInclusive: string | null = null;
    let grossPresented = "";
    const treatments = new Set<string>();

    // Parallel stacking: exclusive taxes accumulate on the original base.
    // Inclusive taxes extract from the supplied gross base (typically one inclusive rule).
    for (const rule of selection.selected) {
      const calc = calculateTaxAmount({
        treatment: rule.treatment,
        ratePercent: rule.ratePercent,
        baseAmount: request.baseAmount,
        currencyCode,
        roundingMode,
      });
      treatments.add(rule.treatment);

      const taxPresented = roundScaledToPresentation(
        calc.taxAmount,
        presentationScale,
        roundingMode
      );
      const basisPresented = roundScaledToPresentation(
        calc.netPrincipalAmount,
        presentationScale,
        roundingMode
      );
      const grossRound = roundScaledToPresentation(
        calc.grossAmount,
        presentationScale,
        roundingMode
      );
      grossPresented = scaledToString(grossRound);
      totalTax = {
        units: totalTax.units + calc.taxAmount.units,
        scale: totalTax.scale,
        currencyCode,
      };

      if (rule.treatment === TAX_TREATMENT_CODES.INCLUSIVE) {
        netPrincipalFromInclusive = scaledToString(
          roundScaledToPresentation(
            calc.netPrincipalAmount,
            presentationScale,
            roundingMode
          )
        );
      }

      const componentTypeCode =
        rule.taxTypeCode === EXAMPLE_TAX_TYPE_CODES.LEVY
          ? COMMERCIAL_COMPONENT_TYPE_CODES.LEVY
          : COMMERCIAL_COMPONENT_TYPE_CODES.TAX;

      const componentId = `tax-${rule.taxRuleId}`;
      const component: ResolvedTaxComponent = {
        componentId,
        componentTypeCode: componentTypeCode as "TAX" | "LEVY",
        taxTypeCode: rule.taxTypeCode,
        taxTypeLabel: rule.taxTypeLabel,
        treatment: rule.treatment,
        ratePercent: rule.ratePercent,
        taxAmount: scaledToString(taxPresented),
        taxAmountNumber: scaledToNumber(taxPresented),
        calculationBasisAmount: scaledToString(basisPresented),
        calculationBasis: calc.calculationBasis,
        currencyCode,
        effectiveAt: effectiveAtIso,
        taxRuleId: rule.taxRuleId,
        ruleVersion: rule.ruleVersion ?? null,
        resolvedAt,
      };
      taxComponents.push(component);

      contributions.push({
        componentId,
        componentTypeCode,
        amount: scaledToString(taxPresented),
        currencyCode,
        calculationBasis: calc.calculationBasis,
        dependsOn: ["principal"],
        provenance: {
          source: "IP-03_TAX_RESOLUTION",
          ruleId: rule.taxRuleId,
          ruleVersion: rule.ruleVersion ?? null,
          notes: `${rule.taxTypeCode} @ ${rule.ratePercent}% (${rule.treatment})`,
        },
      });
    }

    const totalTaxPresented = roundScaledToPresentation(
      totalTax,
      presentationScale,
      roundingMode
    );

    const treatment: TaxResolutionResult["treatment"] =
      treatments.size === 1
        ? (selection.selected[0]!.treatment)
        : "MULTI";

    return {
      businessId: request.businessId,
      currencyCode,
      effectiveAt: effectiveAtIso,
      treatment,
      taxComponents,
      netPrincipalAmount: netPrincipalFromInclusive,
      grossAmount: grossPresented,
      totalTaxAmount: scaledToString(totalTaxPresented),
      totalTaxAmountNumber: scaledToNumber(totalTaxPresented),
      compositionContributions: contributions,
    };
  }
}

export function createTaxResolutionService() {
  return new TaxResolutionService();
}
