/**
 * Purpose:
 * Commercial adjustment applicability, effective dating, conflict selection.
 *
 * Implementation Package:
 * BP-005 / IP-04 – Discounts & Commercial Adjustments
 */

import {
  ADJUSTMENT_RULE_STATUS_CODES,
  ADJUSTMENT_STACKING_CODES,
  type AdjustmentRuleStatusCode,
} from "@/modules/commercial/constants";
import { resolveEffectiveAt } from "@/modules/commercial/services/base-price-candidate-rules";
import { normalizePricingDimension } from "@/modules/product/services/pricing-rules";
import type { CommercialAdjustmentRuleConfiguration } from "@/modules/commercial/types";

export function isAdjustmentLifecycleApplicable(
  status: AdjustmentRuleStatusCode | string
): boolean {
  return status === ADJUSTMENT_RULE_STATUS_CODES.ACTIVE;
}

export function isAdjustmentEffectiveAt(
  rule: Pick<CommercialAdjustmentRuleConfiguration, "effectiveFrom" | "effectiveTo">,
  asAt: Date
): boolean {
  const from = new Date(rule.effectiveFrom);
  if (Number.isNaN(from.getTime()) || from > asAt) {
    return false;
  }
  const to = rule.effectiveTo ? new Date(rule.effectiveTo) : null;
  if (to && to < asAt) {
    return false;
  }
  return true;
}

function dimensionMatches(
  ruleValue: string | null | undefined,
  requestValue: string | null | undefined
): boolean {
  const normalizedRule = normalizePricingDimension(ruleValue);
  if (normalizedRule == null) {
    return true;
  }
  const normalizedRequest = normalizePricingDimension(requestValue);
  if (normalizedRequest == null) {
    return false;
  }
  return normalizedRule === normalizedRequest;
}

export type AdjustmentApplicabilityContext = {
  businessId: string;
  currencyCode: string;
  offeringId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  quantity?: number | null;
  effectiveAt?: Date | string | null;
};

export function filterApplicableAdjustmentRules(
  rules: CommercialAdjustmentRuleConfiguration[],
  context: AdjustmentApplicabilityContext
): { effectiveAt: Date; candidates: CommercialAdjustmentRuleConfiguration[] } {
  const effectiveAt = resolveEffectiveAt(context.effectiveAt);
  const currency = context.currencyCode.trim().toUpperCase();
  const qty = context.quantity ?? null;

  const candidates = rules.filter((rule) => {
    if (rule.businessId !== context.businessId) {
      return false;
    }
    if (!isAdjustmentLifecycleApplicable(rule.status)) {
      return false;
    }
    if (!isAdjustmentEffectiveAt(rule, effectiveAt)) {
      return false;
    }
    if (
      rule.currencyCode &&
      rule.currencyCode.trim().toUpperCase() !== currency
    ) {
      return false;
    }
    if (!dimensionMatches(rule.offeringId, context.offeringId)) {
      return false;
    }
    if (!dimensionMatches(rule.customerSegment, context.customerSegment)) {
      return false;
    }
    if (!dimensionMatches(rule.salesChannel, context.salesChannel)) {
      return false;
    }
    if (!dimensionMatches(rule.region, context.region)) {
      return false;
    }
    if (rule.minQuantity != null && qty != null && qty < rule.minQuantity) {
      return false;
    }
    if (rule.maxQuantity != null && qty != null && qty > rule.maxQuantity) {
      return false;
    }
    return true;
  });

  return { effectiveAt, candidates };
}

export function adjustmentSpecificityScore(
  rule: CommercialAdjustmentRuleConfiguration,
  context: AdjustmentApplicabilityContext
): number {
  let score = 0;
  const dims: Array<[string | null | undefined, string | null | undefined]> = [
    [rule.offeringId, context.offeringId],
    [rule.customerSegment, context.customerSegment],
    [rule.salesChannel, context.salesChannel],
    [rule.region, context.region],
  ];
  for (const [ruleValue, requestValue] of dims) {
    const nr = normalizePricingDimension(ruleValue);
    const nq = normalizePricingDimension(requestValue);
    if (nr != null && nr === nq) {
      score += 20;
    } else if (nr == null) {
      score += 2;
    }
  }
  return score;
}

/**
 * Exclusive rules conflict when multiple match the same adjustmentCode (or any
 * exclusive group). Additive rules with different codes may compose.
 * Same-code ties → CONFLICT (IP-05 boundary).
 */
export function selectAdjustmentRulesForResolution(
  candidates: CommercialAdjustmentRuleConfiguration[],
  context: AdjustmentApplicabilityContext
):
  | { outcome: "SELECTED"; selected: CommercialAdjustmentRuleConfiguration[] }
  | {
      outcome: "CONFLICT";
      tied: CommercialAdjustmentRuleConfiguration[];
      adjustmentCode: string;
    }
  | { outcome: "MISSING" } {
  if (candidates.length === 0) {
    return { outcome: "MISSING" };
  }

  const exclusive = candidates.filter(
    (r) => r.stacking === ADJUSTMENT_STACKING_CODES.EXCLUSIVE
  );
  if (exclusive.length > 1) {
    const ranked = exclusive
      .map((rule) => ({
        rule,
        score: adjustmentSpecificityScore(rule, context),
      }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0]!.score;
    const tied = ranked.filter((r) => r.score === top).map((r) => r.rule);
    if (tied.length !== 1) {
      return {
        outcome: "CONFLICT",
        tied,
        adjustmentCode: tied.map((t) => t.adjustmentCode).join("|"),
      };
    }
    // Unique exclusive winner suppresses other exclusives; additives still allowed
    const winner = tied[0]!;
    const additives = candidates.filter(
      (r) =>
        r.stacking === ADJUSTMENT_STACKING_CODES.ADDITIVE &&
        r.adjustmentRuleId !== winner.adjustmentRuleId
    );
    return { outcome: "SELECTED", selected: [winner, ...additives] };
  }

  const byCode = new Map<string, CommercialAdjustmentRuleConfiguration[]>();
  for (const rule of candidates) {
    const list = byCode.get(rule.adjustmentCode) ?? [];
    list.push(rule);
    byCode.set(rule.adjustmentCode, list);
  }

  const selected: CommercialAdjustmentRuleConfiguration[] = [];
  for (const [adjustmentCode, group] of byCode) {
    const ranked = group
      .map((rule) => ({
        rule,
        score: adjustmentSpecificityScore(rule, context),
      }))
      .sort((a, b) => b.score - a.score);
    const top = ranked[0]!.score;
    const tied = ranked.filter((r) => r.score === top).map((r) => r.rule);
    if (tied.length !== 1) {
      return { outcome: "CONFLICT", tied, adjustmentCode };
    }
    selected.push(tied[0]!);
  }

  return { outcome: "SELECTED", selected };
}
