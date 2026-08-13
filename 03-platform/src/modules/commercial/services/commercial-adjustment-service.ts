/**
 * Purpose:
 * Resolve commercial discounts/surcharges and emit IP-02 contributions.
 *
 * Implementation Package:
 * BP-005 / IP-04 – Discounts & Commercial Adjustments
 */

import type { CurrentBusinessContext } from "@/core/auth/types";

import {
  ADJUSTMENT_DIRECTION_CODES,
  COMMERCIAL_COMPONENT_TYPE_CODES,
  COMMERCIAL_IP,
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
  filterApplicableAdjustmentRules,
  selectAdjustmentRulesForResolution,
} from "@/modules/commercial/services/discount-applicability-rules";
import { calculateAdjustmentAmount } from "@/modules/commercial/services/discount-calculation-rules";
import type {
  CommercialAdjustmentResolutionRequest,
  CommercialAdjustmentResolutionResult,
  CommercialComponentContribution,
  ResolvedCommercialAdjustment,
} from "@/modules/commercial/types";

export class CommercialAdjustmentService {
  resolve(
    context: CurrentBusinessContext,
    request: CommercialAdjustmentResolutionRequest
  ): CommercialAdjustmentResolutionResult {
    if (!request.businessId) {
      throw new CommercialError(
        "INVALID_INPUT",
        "businessId is required for adjustment resolution.",
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

    const currencyCode = request.currencyCode.trim().toUpperCase();
    const roundingMode: CommercialRoundingMode =
      request.roundingMode ?? "HALF_UP";
    const presentationScale =
      request.presentationScale ?? COMMERCIAL_DEFAULT_PRESENTATION_SCALE;
    const requireConfig = request.requireAdjustmentConfiguration === true;
    const enforceApproval = request.enforceApprovalThreshold !== false;

    const applicability = filterApplicableAdjustmentRules(
      request.adjustmentRules,
      {
        businessId: request.businessId,
        currencyCode,
        offeringId: request.offeringId,
        customerSegment: request.customerSegment,
        salesChannel: request.salesChannel,
        region: request.region,
        quantity: request.quantity,
        effectiveAt: request.effectiveAt,
      }
    );

    const selection = selectAdjustmentRulesForResolution(
      applicability.candidates,
      {
        businessId: request.businessId,
        currencyCode,
        offeringId: request.offeringId,
        customerSegment: request.customerSegment,
        salesChannel: request.salesChannel,
        region: request.region,
        quantity: request.quantity,
        effectiveAt: request.effectiveAt,
      }
    );

    if (selection.outcome === "MISSING") {
      if (requireConfig) {
        throw new CommercialError(
          "ADJUSTMENT_CONFIGURATION_MISSING",
          COMMERCIAL_USER_MESSAGES.ADJUSTMENT_CONFIGURATION_MISSING,
          404
        );
      }
      return emptyResult(
        request.businessId,
        currencyCode,
        applicability.effectiveAt.toISOString(),
        presentationScale
      );
    }

    if (selection.outcome === "CONFLICT") {
      throw new CommercialError(
        "ADJUSTMENT_CONFIGURATION_CONFLICT",
        COMMERCIAL_USER_MESSAGES.ADJUSTMENT_CONFIGURATION_CONFLICT,
        409,
        undefined,
        {
          adjustmentCode: selection.adjustmentCode,
          tiedRuleIds: selection.tied.map((r) => r.adjustmentRuleId),
          precedenceOwner: COMMERCIAL_IP.IP_05_PRECEDENCE,
        }
      );
    }

    const effectiveAtIso = applicability.effectiveAt.toISOString();
    const resolvedAt = new Date().toISOString();
    const adjustments: ResolvedCommercialAdjustment[] = [];
    const contributions: CommercialComponentContribution[] = [];

    let totalDiscount = zeroScaled(currencyCode, COMMERCIAL_INTERNAL_MONEY_SCALE);
    let totalSurcharge = zeroScaled(
      currencyCode,
      COMMERCIAL_INTERNAL_MONEY_SCALE
    );

    for (const rule of selection.selected) {
      const calc = calculateAdjustmentAmount({
        method: rule.method,
        direction: rule.direction,
        basis: rule.basis,
        principalAmount: request.principalAmount,
        commercialSubtotalAmount: request.commercialSubtotalAmount,
        percentage: rule.percentage,
        fixedAmount: rule.fixedAmount,
        maxAmount: rule.maxAmount,
        maxPercent: rule.maxPercent,
        currencyCode,
        roundingMode,
      });

      const presented = roundScaledToPresentation(
        calc.adjustmentMagnitude,
        presentationScale,
        roundingMode
      );
      const basisPresented = roundScaledToPresentation(
        calc.basisAmount,
        presentationScale,
        roundingMode
      );

      let requiresApproval = false;
      if (rule.approvalThresholdAmount != null) {
        const threshold = parseMoneyToScaled(
          rule.approvalThresholdAmount,
          currencyCode,
          COMMERCIAL_INTERNAL_MONEY_SCALE
        );
        if (calc.adjustmentMagnitude.units > threshold.units) {
          requiresApproval = true;
          if (enforceApproval) {
            throw new CommercialError(
              "ADJUSTMENT_APPROVAL_REQUIRED",
              COMMERCIAL_USER_MESSAGES.ADJUSTMENT_APPROVAL_REQUIRED,
              409,
              "approvalThresholdAmount",
              {
                adjustmentRuleId: rule.adjustmentRuleId,
                amount: scaledToString(calc.adjustmentMagnitude),
                threshold: scaledToString(threshold),
              }
            );
          }
        }
      }

      const componentTypeCode =
        rule.direction === ADJUSTMENT_DIRECTION_CODES.DISCOUNT
          ? COMMERCIAL_COMPONENT_TYPE_CODES.DISCOUNT
          : COMMERCIAL_COMPONENT_TYPE_CODES.SURCHARGE;

      if (rule.direction === ADJUSTMENT_DIRECTION_CODES.DISCOUNT) {
        totalDiscount = {
          units: totalDiscount.units + calc.adjustmentMagnitude.units,
          scale: totalDiscount.scale,
          currencyCode,
        };
      } else {
        totalSurcharge = {
          units: totalSurcharge.units + calc.adjustmentMagnitude.units,
          scale: totalSurcharge.scale,
          currencyCode,
        };
      }

      const componentId = `adj-${rule.adjustmentRuleId}`;
      adjustments.push({
        componentId,
        componentTypeCode: componentTypeCode as "DISCOUNT" | "SURCHARGE",
        adjustmentCode: rule.adjustmentCode,
        adjustmentLabel: rule.adjustmentLabel,
        method: rule.method,
        direction: rule.direction,
        basis: rule.basis,
        percentage: calc.percentage,
        configuredFixedAmount: calc.configuredFixedAmount,
        adjustmentAmount: scaledToString(presented),
        adjustmentAmountNumber: scaledToNumber(presented),
        calculationBasisAmount: scaledToString(basisPresented),
        calculationBasis: calc.calculationBasis,
        currencyCode,
        effectiveAt: effectiveAtIso,
        adjustmentRuleId: rule.adjustmentRuleId,
        ruleVersion: rule.ruleVersion ?? null,
        capped: calc.capped,
        requiresApproval,
        resolvedAt,
      });

      contributions.push({
        componentId,
        componentTypeCode,
        amount: scaledToString(presented),
        currencyCode,
        calculationBasis: calc.calculationBasis,
        dependsOn: ["principal"],
        provenance: {
          source: "IP-04_ADJUSTMENT_RESOLUTION",
          ruleId: rule.adjustmentRuleId,
          ruleVersion: rule.ruleVersion ?? null,
          notes: `${rule.adjustmentCode} ${rule.direction} ${rule.method} on ${rule.basis}`,
        },
      });
    }

    const discountPresented = roundScaledToPresentation(
      totalDiscount,
      presentationScale,
      roundingMode
    );
    const surchargePresented = roundScaledToPresentation(
      totalSurcharge,
      presentationScale,
      roundingMode
    );

    return {
      businessId: request.businessId,
      currencyCode,
      effectiveAt: effectiveAtIso,
      adjustments,
      totalDiscountAmount: scaledToString(discountPresented),
      totalDiscountAmountNumber: scaledToNumber(discountPresented),
      totalSurchargeAmount: scaledToString(surchargePresented),
      totalSurchargeAmountNumber: scaledToNumber(surchargePresented),
      compositionContributions: contributions,
    };
  }
}

function emptyResult(
  businessId: string,
  currencyCode: string,
  effectiveAt: string,
  presentationScale: number
): CommercialAdjustmentResolutionResult {
  const zero = scaledToString(zeroScaled(currencyCode, presentationScale));
  return {
    businessId,
    currencyCode,
    effectiveAt,
    adjustments: [],
    totalDiscountAmount: zero,
    totalDiscountAmountNumber: 0,
    totalSurchargeAmount: zero,
    totalSurchargeAmountNumber: 0,
    compositionContributions: [],
  };
}

export function createCommercialAdjustmentService() {
  return new CommercialAdjustmentService();
}
