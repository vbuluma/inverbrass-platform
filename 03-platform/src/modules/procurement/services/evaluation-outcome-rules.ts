/**
 * Purpose:
 * Server-side commercial evaluation outcome for BP-009 IP-03.
 * Uses BP-005 scaled money — no IEEE float arithmetic, no persisted totalSavings.
 *
 * Budgeted Savings = Budgeted Amount − Final Quote
 * Negotiated Savings = Initial Quote − Final Quote
 * Savings % = (Budgeted Amount − Final Quote) ÷ Budgeted Amount × 100
 * Awarded Amount = Final Quote unless an explicit award amount is supplied
 */

import {
  COMMERCIAL_DEFAULT_PRESENTATION_SCALE,
  parseMoneyToScaled,
  roundScaledToPresentation,
  scaledToString,
  subtractScaled,
  type ScaledMoney,
} from "@/modules/commercial/money/commercial-money";

export type CommercialOutcomeInput = {
  budgetedAmount: string;
  initialQuote: string;
  finalQuote: string;
  currencyCode: string;
  awardedAmount?: string | null;
};

export type CommercialOutcome = {
  budgetedAmount: string;
  initialQuote: string;
  finalQuote: string;
  budgetedSavings: string;
  negotiatedSavings: string;
  awardedAmount: string;
  savingsPercentage: string;
  overBudget: boolean;
  finalExceedsInitial: boolean;
  currencyCode: string;
};

function requireNonNegative(amount: string, currencyCode: string, field: string): ScaledMoney {
  const parsed = parseMoneyToScaled(amount, currencyCode);
  if (parsed.units < BigInt(0)) {
    throw new Error(`${field} must be zero or more.`);
  }
  return parsed;
}

function present(money: ScaledMoney): string {
  return scaledToString(
    roundScaledToPresentation(money, COMMERCIAL_DEFAULT_PRESENTATION_SCALE)
  );
}

function formatPercent(savings: ScaledMoney, budget: ScaledMoney): string {
  if (budget.units === BigInt(0)) {
    return "0";
  }
  const scaled = (savings.units * BigInt(10000)) / budget.units;
  const negative = scaled < BigInt(0);
  const abs = negative ? -scaled : scaled;
  const whole = abs / BigInt(100);
  const fraction = abs % BigInt(100);
  const body =
    fraction === BigInt(0) ? whole.toString() : `${whole.toString()}.${fraction.toString().padStart(2, "0")}`;
  return negative ? `-${body}` : body;
}

export function computeCommercialOutcome(input: CommercialOutcomeInput): CommercialOutcome {
  const currencyCode = input.currencyCode.trim().toUpperCase();
  const budgeted = requireNonNegative(input.budgetedAmount, currencyCode, "Budgeted amount");
  const initial = requireNonNegative(input.initialQuote, currencyCode, "Initial quote");
  const finalQuote = requireNonNegative(input.finalQuote, currencyCode, "Final quote");
  const awarded = input.awardedAmount?.trim()
    ? requireNonNegative(input.awardedAmount, currencyCode, "Awarded amount")
    : finalQuote;

  const budgetedSavings = subtractScaled(budgeted, finalQuote);
  const negotiatedSavings = subtractScaled(initial, finalQuote);

  return {
    budgetedAmount: present(budgeted),
    initialQuote: present(initial),
    finalQuote: present(finalQuote),
    budgetedSavings: present(budgetedSavings),
    negotiatedSavings: present(negotiatedSavings),
    awardedAmount: present(awarded),
    savingsPercentage: formatPercent(budgetedSavings, budgeted),
    overBudget: budgetedSavings.units < BigInt(0),
    finalExceedsInitial: finalQuote.units > initial.units,
    currencyCode,
  };
}

export function formatProcurementMoney(amount: string, currencyCode: string): string {
  const presented = present(parseMoneyToScaled(amount, currencyCode));
  const [whole, fraction] = presented.replace("-", "").split(".");
  const grouped = (whole ?? "0").replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const sign = presented.startsWith("-") ? "-" : "";
  const decimals = fraction && Number(fraction) !== 0 ? `.${fraction}` : "";
  return `${currencyCode.trim().toUpperCase()} ${sign}${grouped}${decimals}`;
}

export type CommercialLabels = {
  budgetedAmount: string;
  initialQuote: string;
  finalQuote: string;
  budgetedSavings: string;
  negotiatedSavings: string;
  awardedAmount: string;
  savingsPercentage: string;
};

export function labelCommercialOutcome(outcome: CommercialOutcome): CommercialLabels {
  return {
    budgetedAmount: formatProcurementMoney(outcome.budgetedAmount, outcome.currencyCode),
    initialQuote: formatProcurementMoney(outcome.initialQuote, outcome.currencyCode),
    finalQuote: formatProcurementMoney(outcome.finalQuote, outcome.currencyCode),
    budgetedSavings: formatProcurementMoney(outcome.budgetedSavings, outcome.currencyCode),
    negotiatedSavings: formatProcurementMoney(outcome.negotiatedSavings, outcome.currencyCode),
    awardedAmount: formatProcurementMoney(outcome.awardedAmount, outcome.currencyCode),
    savingsPercentage: `${outcome.savingsPercentage}%`,
  };
}

export function initialAndFinalFromVersions(
  versions: ReadonlyArray<{ version: number; amount: string }>
): { initialQuote: string; finalQuote: string } | null {
  if (versions.length === 0) {
    return null;
  }
  const ordered = [...versions].sort((a, b) => a.version - b.version);
  return {
    initialQuote: ordered[0]!.amount,
    finalQuote: ordered[ordered.length - 1]!.amount,
  };
}
