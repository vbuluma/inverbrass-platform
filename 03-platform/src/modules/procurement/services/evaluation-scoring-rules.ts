/**
 * Purpose:
 * Pure IP-05 evaluation scoring — technical, financial, overall, rank, recommendation.
 * Does not persist scores or create awards.
 */

import { EVALUATION_METHODS } from "@/modules/procurement/services/sourcing-rfx-rules";

export type PhaseConfig = {
  phaseCode: string;
  included: boolean;
  weight: string;
  passmark: string;
  required: boolean;
};

export type PhaseScoreRow = {
  phaseCode: string;
  score: string;
};

export type SupplierQuoteFinancials = {
  profileId: string;
  amount: string;
  year1Amount: string | null;
  tcvAmount: string | null;
  tcoAmount: string | null;
};

export type SupplierEvaluationRow = {
  profileId: string;
  technicalScore: string | null;
  financialScore: string | null;
  overallScore: string | null;
  rank: number | null;
  technicallyQualified: boolean;
  financialAmount: string;
  recommended: boolean;
};

function parseScore(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatScore(value: number): string {
  return value.toFixed(2);
}

export function resolveFinancialAmount(
  quote: Pick<SupplierQuoteFinancials, "amount" | "year1Amount" | "tcvAmount" | "tcoAmount">,
  financialBasis: string
): string {
  const basis = financialBasis.trim().toUpperCase();
  if (basis === "TCV" && quote.tcvAmount?.trim()) {
    return quote.tcvAmount;
  }
  if (basis === "TCO" && quote.tcoAmount?.trim()) {
    return quote.tcoAmount;
  }
  if (basis === "YEAR_1" && quote.year1Amount?.trim()) {
    return quote.year1Amount;
  }
  return quote.amount;
}

export function computeTechnicalScore(
  phases: PhaseConfig[],
  phaseScores: PhaseScoreRow[]
): { score: string; qualified: boolean } {
  const included = phases.filter((row) => row.included);
  if (included.length === 0) {
    return { score: "100.00", qualified: true };
  }
  const scoreMap = new Map(phaseScores.map((row) => [row.phaseCode, parseScore(row.score)]));
  let weightedTotal = 0;
  let weightSum = 0;
  let qualified = true;
  for (const phase of included) {
    const score = scoreMap.get(phase.phaseCode) ?? 0;
    const weight = parseScore(phase.weight);
    const passmark = parseScore(phase.passmark);
    if (phase.required && score < passmark) {
      qualified = false;
    }
    if (weight > 0) {
      weightedTotal += score * weight;
      weightSum += weight;
    }
  }
  if (weightSum === 0) {
    const average =
      included.reduce((sum, phase) => sum + (scoreMap.get(phase.phaseCode) ?? 0), 0) /
      included.length;
    return { score: formatScore(average), qualified };
  }
  return { score: formatScore(weightedTotal / weightSum), qualified };
}

export function computeFinancialScore(supplierAmount: string, lowestAmount: string): string {
  const supplier = parseScore(supplierAmount);
  const lowest = parseScore(lowestAmount);
  if (supplier <= 0 || lowest <= 0) {
    return "0.00";
  }
  const score = (lowest / supplier) * 100;
  return formatScore(Math.min(score, 100));
}

export function computeOverallScore(
  technicalScore: string,
  financialScore: string,
  technicalWeight: string,
  financialWeight: string
): string {
  const tech = parseScore(technicalScore);
  const fin = parseScore(financialScore);
  const techW = parseScore(technicalWeight);
  const finW = parseScore(financialWeight);
  const totalWeight = techW + finW;
  if (totalWeight === 0) {
    return formatScore(fin);
  }
  return formatScore((tech * techW + fin * finW) / totalWeight);
}

export function buildSupplierEvaluationRows(input: {
  evaluationMethod: string;
  financialBasis: string;
  technicalWeight: string;
  financialWeight: string;
  phases: PhaseConfig[];
  quotes: SupplierQuoteFinancials[];
  phaseScores: Array<{ profileId: string; phaseCode: string; score: string }>;
}): SupplierEvaluationRow[] {
  const method = input.evaluationMethod.trim().toUpperCase();
  const rows: SupplierEvaluationRow[] = [];
  const financialAmounts = input.quotes.map((quote) => ({
    profileId: quote.profileId,
    amount: resolveFinancialAmount(quote, input.financialBasis),
  }));
  const qualifiedRows: Array<{
    profileId: string;
    technicalScore: string;
    financialScore: string;
    overallScore: string;
    technicallyQualified: boolean;
    financialAmount: string;
  }> = [];

  for (const quote of input.quotes) {
    const supplierPhaseScores = input.phaseScores
      .filter((row) => row.profileId === quote.profileId)
      .map((row) => ({ phaseCode: row.phaseCode, score: row.score }));
    const technical = computeTechnicalScore(input.phases, supplierPhaseScores);
    const financialAmount = resolveFinancialAmount(quote, input.financialBasis);
    qualifiedRows.push({
      profileId: quote.profileId,
      technicalScore: technical.score,
      financialScore: "0.00",
      overallScore: "0.00",
      technicallyQualified: technical.qualified,
      financialAmount,
    });
  }

  const compliant = qualifiedRows.filter((row) => row.technicallyQualified);
  const lowestAmount = compliant.reduce<string | null>((lowest, row) => {
    if (!lowest) {
      return row.financialAmount;
    }
    return parseScore(row.financialAmount) < parseScore(lowest) ? row.financialAmount : lowest;
  }, null);

  for (const row of qualifiedRows) {
    if (row.technicallyQualified && lowestAmount) {
      row.financialScore = computeFinancialScore(row.financialAmount, lowestAmount);
    }
    if (method === EVALUATION_METHODS.BEST_OVERALL) {
      row.overallScore = computeOverallScore(
        row.technicalScore,
        row.financialScore,
        input.technicalWeight,
        input.financialWeight
      );
    } else if (method === EVALUATION_METHODS.LOWEST_COMPLIANT) {
      row.overallScore = row.financialScore;
    } else {
      row.overallScore = row.technicalScore;
    }
  }

  const sortable = [...qualifiedRows];
  if (method === EVALUATION_METHODS.LOWEST_COMPLIANT || method === EVALUATION_METHODS.MANUAL) {
    sortable.sort(
      (a, b) =>
        (a.technicallyQualified === b.technicallyQualified ? 0 : a.technicallyQualified ? -1 : 1) ||
        parseScore(a.financialAmount) - parseScore(b.financialAmount)
    );
  } else {
    sortable.sort(
      (a, b) =>
        (a.technicallyQualified === b.technicallyQualified ? 0 : a.technicallyQualified ? -1 : 1) ||
        parseScore(b.overallScore) - parseScore(a.overallScore)
    );
  }

  let rank = 0;
  const recommendedProfileIds = new Set<string>();
  for (const row of sortable) {
    if (!row.technicallyQualified) {
      rows.push({
        profileId: row.profileId,
        technicalScore: row.technicalScore,
        financialScore: row.financialScore,
        overallScore: row.overallScore,
        rank: null,
        technicallyQualified: false,
        financialAmount: row.financialAmount,
        recommended: false,
      });
      continue;
    }
    rank += 1;
    const recommended = rank === 1;
    if (recommended) {
      recommendedProfileIds.add(row.profileId);
    }
    rows.push({
      profileId: row.profileId,
      technicalScore: row.technicalScore,
      financialScore: row.financialScore,
      overallScore: row.overallScore,
      rank,
      technicallyQualified: true,
      financialAmount: row.financialAmount,
      recommended,
    });
  }

  for (const quote of input.quotes) {
    if (!rows.some((row) => row.profileId === quote.profileId)) {
      rows.push({
        profileId: quote.profileId,
        technicalScore: null,
        financialScore: null,
        overallScore: null,
        rank: null,
        technicallyQualified: false,
        financialAmount: resolveFinancialAmount(quote, input.financialBasis),
        recommended: false,
      });
    }
  }

  return rows;
}

export function requiresAwardOverride(
  recommendedProfileIds: string[],
  awardedProfileIds: string[]
): boolean {
  if (recommendedProfileIds.length === 0) {
    return false;
  }
  const recommended = new Set(recommendedProfileIds);
  if (awardedProfileIds.length !== recommendedProfileIds.length) {
    return true;
  }
  return awardedProfileIds.some((id) => !recommended.has(id));
}

export function explainEvaluationMethodology(input: {
  evaluationMethod: string;
  technicalWeight: string;
  financialWeight: string;
  phases: PhaseConfig[];
}): string {
  const method = input.evaluationMethod.trim().toUpperCase();
  const includedPhases = input.phases.filter((row) => row.included);
  const passmarks = includedPhases
    .filter((row) => row.required && parseScore(row.passmark) > 0)
    .map((row) => `${row.phaseCode} ${row.passmark}%`);
  const passmarkText =
    passmarks.length > 0
      ? ` Suppliers must achieve the configured technical passmarks (${passmarks.join(", ")}).`
      : includedPhases.length > 0
        ? " Suppliers must meet the configured technical phase requirements."
        : "";

  if (method === EVALUATION_METHODS.LOWEST_COMPLIANT) {
    return `Award methodology: Lowest Compliant Price.${passmarkText} Among suppliers meeting the technical requirement, the lowest eligible final quotation is recommended.`;
  }
  if (method === EVALUATION_METHODS.BEST_OVERALL) {
    return `Award methodology: Best Overall Score. Technical evaluation contributes ${input.technicalWeight}% and financial evaluation contributes ${input.financialWeight}%. Supplier ranking is based on the combined weighted score.${passmarkText}`;
  }
  return `Award methodology: Manual evaluation. The buyer records scores and selects the award recommendation.${passmarkText}`;
}
