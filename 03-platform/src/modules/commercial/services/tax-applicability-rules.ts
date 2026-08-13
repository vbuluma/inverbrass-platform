/**
 * Purpose:
 * Tax rule applicability, effective dating, and conflict detection (pure).
 *
 * Implementation Package:
 * BP-005 / IP-03 – Tax Rules & Calculation
 */

import {
  TAX_RULE_STATUS_CODES,
  type TaxRuleStatusCode,
} from "@/modules/commercial/constants";
import { normalizePricingDimension } from "@/modules/product/services/pricing-rules";
import { resolveEffectiveAt } from "@/modules/commercial/services/base-price-candidate-rules";
import type { TaxRuleConfiguration } from "@/modules/commercial/types";

export function isTaxRuleLifecycleApplicable(status: TaxRuleStatusCode | string): boolean {
  return status === TAX_RULE_STATUS_CODES.ACTIVE;
}

export function isTaxRuleEffectiveAt(
  rule: Pick<TaxRuleConfiguration, "effectiveFrom" | "effectiveTo">,
  asAt: Date
): boolean {
  const from = new Date(rule.effectiveFrom);
  const to = rule.effectiveTo ? new Date(rule.effectiveTo) : null;
  if (Number.isNaN(from.getTime())) {
    return false;
  }
  if (from > asAt) {
    return false;
  }
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
    return true; // wildcard
  }
  const normalizedRequest = normalizePricingDimension(requestValue);
  if (normalizedRequest == null) {
    return false; // rule requires a dimension the request did not provide
  }
  return normalizedRule === normalizedRequest;
}

export type TaxApplicabilityContext = {
  businessId: string;
  currencyCode: string;
  offeringId?: string | null;
  customerSegment?: string | null;
  salesChannel?: string | null;
  region?: string | null;
  jurisdictionCode?: string | null;
  effectiveAt?: Date | string | null;
};

export function filterApplicableTaxRules(
  rules: TaxRuleConfiguration[],
  context: TaxApplicabilityContext
): { effectiveAt: Date; candidates: TaxRuleConfiguration[] } {
  const effectiveAt = resolveEffectiveAt(context.effectiveAt);
  const currency = context.currencyCode.trim().toUpperCase();

  const candidates = rules.filter((rule) => {
    if (rule.businessId !== context.businessId) {
      return false;
    }
    if (!isTaxRuleLifecycleApplicable(rule.status)) {
      return false;
    }
    if (!isTaxRuleEffectiveAt(rule, effectiveAt)) {
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
    if (!dimensionMatches(rule.jurisdictionCode, context.jurisdictionCode)) {
      return false;
    }
    return true;
  });

  return { effectiveAt, candidates };
}

/**
 * Specificity score — higher = more exact dimension matches.
 * Ties among same taxTypeCode → conflict (IP-05 boundary / interim fail-closed).
 */
export function taxRuleSpecificityScore(
  rule: TaxRuleConfiguration,
  context: TaxApplicabilityContext
): number {
  let score = 0;
  const dims: Array<[string | null | undefined, string | null | undefined]> = [
    [rule.offeringId, context.offeringId],
    [rule.customerSegment, context.customerSegment],
    [rule.salesChannel, context.salesChannel],
    [rule.region, context.region],
    [rule.jurisdictionCode, context.jurisdictionCode],
  ];
  for (const [ruleValue, requestValue] of dims) {
    const normalizedRule = normalizePricingDimension(ruleValue);
    const normalizedRequest = normalizePricingDimension(requestValue);
    if (normalizedRule != null && normalizedRule === normalizedRequest) {
      score += 20;
    } else if (normalizedRule == null) {
      score += 2;
    }
  }
  if (
    rule.currencyCode &&
    rule.currencyCode.trim().toUpperCase() ===
      context.currencyCode.trim().toUpperCase()
  ) {
    score += 5;
  }
  return score;
}

/**
 * Group candidates by taxTypeCode. Within each type, require a unique winner
 * by specificity; ties → conflict ids. Different tax types may stack (parallel).
 */
export function selectTaxRulesForResolution(
  candidates: TaxRuleConfiguration[],
  context: TaxApplicabilityContext
):
  | { outcome: "SELECTED"; selected: TaxRuleConfiguration[] }
  | { outcome: "CONFLICT"; tied: TaxRuleConfiguration[]; taxTypeCode: string }
  | { outcome: "MISSING" } {
  if (candidates.length === 0) {
    return { outcome: "MISSING" };
  }

  const byType = new Map<string, TaxRuleConfiguration[]>();
  for (const rule of candidates) {
    const list = byType.get(rule.taxTypeCode) ?? [];
    list.push(rule);
    byType.set(rule.taxTypeCode, list);
  }

  const selected: TaxRuleConfiguration[] = [];

  for (const [taxTypeCode, group] of byType) {
    const ranked = group
      .map((rule) => ({
        rule,
        score: taxRuleSpecificityScore(rule, context),
      }))
      .sort((a, b) => b.score - a.score);

    const top = ranked[0]!.score;
    const tied = ranked.filter((r) => r.score === top).map((r) => r.rule);
    if (tied.length !== 1) {
      return { outcome: "CONFLICT", tied, taxTypeCode };
    }
    selected.push(tied[0]!);
  }

  return { outcome: "SELECTED", selected };
}
