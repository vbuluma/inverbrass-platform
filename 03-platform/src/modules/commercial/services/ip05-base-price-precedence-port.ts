/**
 * Purpose:
 * Authoritative IP-05 precedence / eligibility / conflict resolution for
 * base-price candidates identified by IP-01.
 *
 * Replaces the interim specificity stand-in. Ties fail closed — never silent pick.
 *
 * Implementation Package:
 * BP-005 / IP-05 – Pricing Precedence, Eligibility & Conflict Resolution
 */

import {
  buildConflictExplanation,
  buildMissingExplanation,
  buildWinnerExplanation,
  scoreBasePriceCandidates,
} from "@/modules/commercial/services/pricing-precedence-rules";
import type {
  BasePricePrecedenceInput,
  BasePricePrecedenceResult,
} from "@/modules/commercial/types";

export type BasePricePrecedencePort = {
  resolveWinner(input: BasePricePrecedenceInput): BasePricePrecedenceResult;
};

/**
 * Authoritative IP-05 resolver.
 * Eligibility filtering remains in IP-01 (`filterApplicableCandidates`);
 * this engine owns specificity comparison, conflict detection, and explanation.
 */
export class Ip05BasePricePrecedenceResolver implements BasePricePrecedencePort {
  resolveWinner(input: BasePricePrecedenceInput): BasePricePrecedenceResult {
    const { candidates, request } = input;

    if (candidates.length === 0) {
      return {
        outcome: "MISSING",
        resolutionCode: "NO_ELIGIBLE_PRICE",
        explanation: buildMissingExplanation(input),
      };
    }

    if (candidates.length === 1) {
      const winner = candidates[0]!;
      const scored = scoreBasePriceCandidates(candidates, request);
      return {
        outcome: "WINNER",
        resolutionCode: "PRICE_RESOLVED",
        winner,
        selectionMode: "SINGLE_CANDIDATE",
        suppressed: [],
        explanation: buildWinnerExplanation(
          input,
          winner,
          scored,
          "SINGLE_CANDIDATE",
          "SINGLE_CANDIDATE"
        ),
      };
    }

    const scored = scoreBasePriceCandidates(candidates, request);
    const topScore = Math.max(...scored.map((entry) => entry.score));
    const tied = scored
      .filter((entry) => entry.score === topScore)
      .map((entry) => entry.candidate)
      // Deterministic conflict list order only — not a winner selector.
      .sort((a, b) => a.pricingItemId.localeCompare(b.pricingItemId));

    if (tied.length !== 1) {
      return {
        outcome: "CONFLICT",
        resolutionCode: "PRICE_CONFLICT",
        candidates,
        tied,
        explanation: buildConflictExplanation(input, scored, tied),
      };
    }

    const winner = tied[0]!;
    return {
      outcome: "WINNER",
      resolutionCode: "PRICE_RESOLVED",
      winner,
      selectionMode: "SPECIFICITY",
      suppressed: candidates.filter(
        (c) => c.pricingItemId !== winner.pricingItemId
      ),
      explanation: buildWinnerExplanation(
        input,
        winner,
        scored,
        "SPECIFICITY",
        "SPECIFICITY_COMPARISON"
      ),
    };
  }
}

/** @deprecated Prefer createIp05BasePricePrecedenceResolver — alias for compatibility. */
export class InterimIp05BasePricePrecedenceResolver extends Ip05BasePricePrecedenceResolver {}

export function createIp05BasePricePrecedenceResolver() {
  return new Ip05BasePricePrecedenceResolver();
}

/** @deprecated Prefer createIp05BasePricePrecedenceResolver. */
export function createInterimIp05BasePricePrecedenceResolver() {
  return createIp05BasePricePrecedenceResolver();
}
