/**
 * Purpose:
 * Explicit, deterministic base-price specificity scoring and explanation (IP-05).
 *
 * Does not invent winners on ties. Does not use insertion order, UUID order,
 * cheapest/latest heuristics, or LIMIT 1.
 *
 * Implementation Package:
 * BP-005 / IP-05 – Pricing Precedence, Eligibility & Conflict Resolution
 */

import { normalizePricingDimension } from "@/modules/product/services/pricing-rules";

import { BASE_PRICE_PRECEDENCE_WEIGHTS } from "@/modules/commercial/constants";
import type {
  BasePriceCandidate,
  BasePricePrecedenceExplanation,
  BasePricePrecedenceInput,
  BasePriceResolutionRequest,
  BasePriceScoredCandidate,
} from "@/modules/commercial/types";

type SpecificityRequest = Pick<
  BasePriceResolutionRequest,
  | "pricingCatalogueId"
  | "customerSegment"
  | "salesChannel"
  | "region"
  | "currencyCode"
>;

/**
 * Authoritative specificity score for an eligible base-price candidate.
 * Higher = more specifically targeted to the request.
 *
 * @deprecated Name alias — prefer `basePriceSpecificityScore`. Kept for IP-01 smoke imports.
 */
export function interimSpecificityScore(
  candidate: BasePriceCandidate,
  request: SpecificityRequest
): number {
  return basePriceSpecificityScore(candidate, request);
}

/**
 * Authoritative IP-05 specificity score.
 * Weights live in BASE_PRICE_PRECEDENCE_WEIGHTS (explicit configuration).
 */
export function basePriceSpecificityScore(
  candidate: BasePriceCandidate,
  request: SpecificityRequest
): number {
  let score = 0;

  if (
    request.pricingCatalogueId &&
    candidate.pricingCatalogueId === request.pricingCatalogueId
  ) {
    score += BASE_PRICE_PRECEDENCE_WEIGHTS.CATALOGUE_EXACT;
  }

  score += dimensionSpecificityScore(
    candidate.customerSegment,
    request.customerSegment
  );
  score += dimensionSpecificityScore(
    candidate.salesChannel,
    request.salesChannel
  );
  score += dimensionSpecificityScore(candidate.region, request.region);

  if (
    candidate.currencyCode.trim().toUpperCase() ===
    request.currencyCode.trim().toUpperCase()
  ) {
    score += BASE_PRICE_PRECEDENCE_WEIGHTS.CURRENCY_EXACT;
  }

  return score;
}

function dimensionSpecificityScore(
  itemValue: string | null,
  requestValue: string | null | undefined
): number {
  const normalizedRequest = normalizePricingDimension(requestValue);
  const normalizedItem = normalizePricingDimension(itemValue);

  if (normalizedRequest == null) {
    return normalizedItem == null
      ? BASE_PRICE_PRECEDENCE_WEIGHTS.DIMENSION_BOTH_BROAD
      : BASE_PRICE_PRECEDENCE_WEIGHTS.DIMENSION_NARROW_UNUSED;
  }
  if (normalizedItem === normalizedRequest) {
    return BASE_PRICE_PRECEDENCE_WEIGHTS.DIMENSION_EXACT;
  }
  if (normalizedItem == null) {
    return BASE_PRICE_PRECEDENCE_WEIGHTS.DIMENSION_WILDCARD_WHEN_REQUESTED;
  }
  // Dimension mismatch should already be filtered by IP-01 eligibility.
  return 0;
}

export function scoreBasePriceCandidates(
  candidates: BasePriceCandidate[],
  request: SpecificityRequest
): BasePriceScoredCandidate[] {
  return candidates.map((candidate) => ({
    candidate,
    score: basePriceSpecificityScore(candidate, request),
    dimensionBreakdown: {
      catalogue:
        request.pricingCatalogueId &&
        candidate.pricingCatalogueId === request.pricingCatalogueId
          ? BASE_PRICE_PRECEDENCE_WEIGHTS.CATALOGUE_EXACT
          : 0,
      customerSegment: dimensionSpecificityScore(
        candidate.customerSegment,
        request.customerSegment
      ),
      salesChannel: dimensionSpecificityScore(
        candidate.salesChannel,
        request.salesChannel
      ),
      region: dimensionSpecificityScore(candidate.region, request.region),
      currency:
        candidate.currencyCode.trim().toUpperCase() ===
        request.currencyCode.trim().toUpperCase()
          ? BASE_PRICE_PRECEDENCE_WEIGHTS.CURRENCY_EXACT
          : 0,
    },
  }));
}

/**
 * Stable ordering for explanation lists only — never used to pick a winner.
 * Sort by score desc, then pricingItemId asc (deterministic, not insertion order).
 */
export function rankScoredCandidates(
  scored: BasePriceScoredCandidate[]
): BasePriceScoredCandidate[] {
  return [...scored].sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return a.candidate.pricingItemId.localeCompare(b.candidate.pricingItemId);
  });
}

export function buildWinnerExplanation(
  input: BasePricePrecedenceInput,
  winner: BasePriceCandidate,
  scored: BasePriceScoredCandidate[],
  selectionMode: "SINGLE_CANDIDATE" | "SPECIFICITY",
  precedenceStage: BasePricePrecedenceExplanation["precedenceStage"]
): BasePricePrecedenceExplanation {
  const winnerScored = scored.find(
    (s) => s.candidate.pricingItemId === winner.pricingItemId
  );
  const suppressed = scored
    .filter((s) => s.candidate.pricingItemId !== winner.pricingItemId)
    .map((s) => ({
      pricingItemId: s.candidate.pricingItemId,
      pricingCatalogueId: s.candidate.pricingCatalogueId,
      unitPrice: s.candidate.unitPrice,
      score: s.score,
      reason:
        s.score < (winnerScored?.score ?? 0)
          ? "Lower specificity than winner"
          : "Suppressed non-winner",
    }));

  return {
    resolutionCode: "PRICE_RESOLVED",
    candidateCount: input.candidates.length,
    eligibleCandidateCount: input.candidates.length,
    winningPricingItemId: winner.pricingItemId,
    winningScore: winnerScored?.score ?? 0,
    selectionMode,
    precedenceStage,
    ranked: rankScoredCandidates(scored).map((s) => ({
      pricingItemId: s.candidate.pricingItemId,
      pricingCatalogueId: s.candidate.pricingCatalogueId,
      catalogueCode: s.candidate.catalogueCode,
      unitPrice: s.candidate.unitPrice,
      score: s.score,
      dimensionBreakdown: s.dimensionBreakdown,
    })),
    suppressed,
    tiedPricingItemIds: [],
    conflictReason: null,
    requestDimensions: {
      currencyCode: input.request.currencyCode,
      pricingCatalogueId: input.request.pricingCatalogueId ?? null,
      customerSegment: input.request.customerSegment ?? null,
      salesChannel: input.request.salesChannel ?? null,
      region: input.request.region ?? null,
    },
    effectiveAt: input.effectiveAt.toISOString(),
  };
}

export function buildConflictExplanation(
  input: BasePricePrecedenceInput,
  scored: BasePriceScoredCandidate[],
  tied: BasePriceCandidate[]
): BasePricePrecedenceExplanation {
  const topScore = Math.max(...scored.map((s) => s.score), 0);
  return {
    resolutionCode: "PRICE_CONFLICT",
    candidateCount: input.candidates.length,
    eligibleCandidateCount: input.candidates.length,
    winningPricingItemId: null,
    winningScore: topScore,
    selectionMode: "CONFLICT",
    precedenceStage: "SPECIFICITY_TIE",
    ranked: rankScoredCandidates(scored).map((s) => ({
      pricingItemId: s.candidate.pricingItemId,
      pricingCatalogueId: s.candidate.pricingCatalogueId,
      catalogueCode: s.candidate.catalogueCode,
      unitPrice: s.candidate.unitPrice,
      score: s.score,
      dimensionBreakdown: s.dimensionBreakdown,
    })),
    suppressed: [],
    tiedPricingItemIds: tied.map((c) => c.pricingItemId),
    conflictReason:
      "Multiple eligible candidates share the same specificity score after applying all configured precedence dimensions; no silent winner was selected.",
    requestDimensions: {
      currencyCode: input.request.currencyCode,
      pricingCatalogueId: input.request.pricingCatalogueId ?? null,
      customerSegment: input.request.customerSegment ?? null,
      salesChannel: input.request.salesChannel ?? null,
      region: input.request.region ?? null,
    },
    effectiveAt: input.effectiveAt.toISOString(),
  };
}

export function buildMissingExplanation(
  input: BasePricePrecedenceInput
): BasePricePrecedenceExplanation {
  return {
    resolutionCode: "NO_ELIGIBLE_PRICE",
    candidateCount: 0,
    eligibleCandidateCount: 0,
    winningPricingItemId: null,
    winningScore: 0,
    selectionMode: "MISSING",
    precedenceStage: "NO_CANDIDATES",
    ranked: [],
    suppressed: [],
    tiedPricingItemIds: [],
    conflictReason: null,
    requestDimensions: {
      currencyCode: input.request.currencyCode,
      pricingCatalogueId: input.request.pricingCatalogueId ?? null,
      customerSegment: input.request.customerSegment ?? null,
      salesChannel: input.request.salesChannel ?? null,
      region: input.request.region ?? null,
    },
    effectiveAt: input.effectiveAt.toISOString(),
  };
}
