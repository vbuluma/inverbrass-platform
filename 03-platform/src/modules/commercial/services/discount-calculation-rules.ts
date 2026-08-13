/**
 * Purpose:
 * Pure commercial adjustment amount calculation (percentage / fixed).
 *
 * Implementation Package:
 * BP-005 / IP-04 – Discounts & Commercial Adjustments
 */

import {
  ADJUSTMENT_BASIS_CODES,
  ADJUSTMENT_DIRECTION_CODES,
  ADJUSTMENT_METHOD_CODES,
  type AdjustmentBasisCode,
  type AdjustmentDirectionCode,
  type AdjustmentMethodCode,
} from "@/modules/commercial/constants";
import {
  CommercialError,
  COMMERCIAL_USER_MESSAGES,
} from "@/modules/commercial/errors";
import {
  COMMERCIAL_INTERNAL_MONEY_SCALE,
  parseMoneyToScaled,
  scaledToString,
  type CommercialRoundingMode,
  type ScaledMoney,
} from "@/modules/commercial/money/commercial-money";

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);
const HUNDRED = BigInt(100);

function pow10(n: number): bigint {
  return TEN ** BigInt(n);
}

function roundQuotient(
  numerator: bigint,
  denominator: bigint,
  rounding: CommercialRoundingMode
): bigint {
  if (denominator <= ZERO) {
    throw new Error("Invalid adjustment denominator.");
  }
  const negative = numerator < ZERO;
  const absNum = negative ? -numerator : numerator;
  const quotient = absNum / denominator;
  const remainder = absNum % denominator;
  if (remainder === ZERO) {
    return negative ? -quotient : quotient;
  }
  const half = denominator / TWO;
  let bump = ZERO;
  switch (rounding) {
    case "FLOOR":
      bump = negative ? ONE : ZERO;
      break;
    case "CEIL":
      bump = negative ? ZERO : ONE;
      break;
    case "TRUNC":
      bump = ZERO;
      break;
    case "HALF_EVEN":
      if (
        remainder > half ||
        (remainder === half &&
          denominator % TWO === ZERO &&
          quotient % TWO === ONE)
      ) {
        bump = ONE;
      } else if (remainder === half && denominator % TWO !== ZERO) {
        bump = remainder * TWO >= denominator ? ONE : ZERO;
      }
      break;
    case "HALF_UP":
    default:
      bump = remainder * TWO >= denominator ? ONE : ZERO;
      break;
  }
  const result = quotient + bump;
  return negative ? -result : result;
}

export function assertSupportedAdjustmentBasis(
  basis: string
): asserts basis is AdjustmentBasisCode {
  const allowed = Object.values(ADJUSTMENT_BASIS_CODES) as string[];
  if (!allowed.includes(basis)) {
    throw new CommercialError(
      "UNSUPPORTED_ADJUSTMENT_BASIS",
      COMMERCIAL_USER_MESSAGES.UNSUPPORTED_ADJUSTMENT_BASIS,
      400,
      "basis",
      { basis }
    );
  }
}

export function assertValidAdjustmentMethod(
  method: string
): asserts method is AdjustmentMethodCode {
  const allowed = Object.values(ADJUSTMENT_METHOD_CODES) as string[];
  if (!allowed.includes(method)) {
    throw new CommercialError(
      "INVALID_ADJUSTMENT_METHOD",
      COMMERCIAL_USER_MESSAGES.INVALID_ADJUSTMENT_METHOD,
      400,
      "method",
      { method }
    );
  }
}

export function resolveAdjustmentBasisAmount(input: {
  basis: AdjustmentBasisCode;
  principalAmount: string | number;
  commercialSubtotalAmount?: string | number | null;
  currencyCode: string;
  scale?: number;
}): ScaledMoney {
  assertSupportedAdjustmentBasis(input.basis);
  const scale = input.scale ?? COMMERCIAL_INTERNAL_MONEY_SCALE;
  const currencyCode = input.currencyCode.trim().toUpperCase();

  if (input.basis === ADJUSTMENT_BASIS_CODES.PRINCIPAL) {
    return parseMoneyToScaled(input.principalAmount, currencyCode, scale);
  }

  if (
    input.commercialSubtotalAmount == null ||
    input.commercialSubtotalAmount === undefined
  ) {
    throw new CommercialError(
      "UNSUPPORTED_ADJUSTMENT_BASIS",
      "COMMERCIAL_SUBTOTAL basis requires commercialSubtotalAmount.",
      400,
      "commercialSubtotalAmount"
    );
  }
  return parseMoneyToScaled(
    input.commercialSubtotalAmount,
    currencyCode,
    scale
  );
}

export type AdjustmentCalculationBreakdown = {
  method: AdjustmentMethodCode;
  direction: AdjustmentDirectionCode;
  basis: AdjustmentBasisCode;
  basisAmount: ScaledMoney;
  /** Non-negative magnitude before direction/sign. */
  adjustmentMagnitude: ScaledMoney;
  percentage: number | null;
  configuredFixedAmount: string | null;
  capped: boolean;
  calculationBasis: string;
};

export function calculateAdjustmentAmount(input: {
  method: AdjustmentMethodCode;
  direction: AdjustmentDirectionCode;
  basis: AdjustmentBasisCode;
  principalAmount: string | number;
  commercialSubtotalAmount?: string | number | null;
  percentage?: number | null;
  fixedAmount?: string | number | null;
  maxAmount?: string | number | null;
  maxPercent?: number | null;
  currencyCode: string;
  roundingMode?: CommercialRoundingMode;
  scale?: number;
}): AdjustmentCalculationBreakdown {
  assertValidAdjustmentMethod(input.method);
  assertSupportedAdjustmentBasis(input.basis);

  const rounding = input.roundingMode ?? "HALF_UP";
  const scale = input.scale ?? COMMERCIAL_INTERNAL_MONEY_SCALE;
  const currencyCode = input.currencyCode.trim().toUpperCase();
  const basisAmount = resolveAdjustmentBasisAmount({
    basis: input.basis,
    principalAmount: input.principalAmount,
    commercialSubtotalAmount: input.commercialSubtotalAmount,
    currencyCode,
    scale,
  });

  let magnitude: ScaledMoney;
  let percentage: number | null = null;
  let configuredFixedAmount: string | null = null;
  let calculationBasis: string;

  if (input.method === ADJUSTMENT_METHOD_CODES.PERCENTAGE) {
    const pct = input.percentage;
    if (pct == null || !Number.isFinite(pct) || pct < 0) {
      throw new CommercialError(
        "INVALID_ADJUSTMENT_PERCENTAGE",
        COMMERCIAL_USER_MESSAGES.INVALID_ADJUSTMENT_PERCENTAGE,
        400,
        "percentage",
        { percentage: pct }
      );
    }
    percentage = pct;
    const rate = parseMoneyToScaled(pct, "TMP", scale);
    const taxUnits = roundQuotient(
      basisAmount.units * rate.units,
      HUNDRED * pow10(scale),
      rounding
    );
    magnitude = { units: taxUnits, scale, currencyCode };
    calculationBasis = `${input.basis} × ${pct}% (${scaledToString(basisAmount)} × ${pct}/100)`;
  } else {
    if (input.fixedAmount == null || input.fixedAmount === undefined) {
      throw new CommercialError(
        "INVALID_ADJUSTMENT_AMOUNT",
        COMMERCIAL_USER_MESSAGES.INVALID_ADJUSTMENT_AMOUNT,
        400,
        "fixedAmount"
      );
    }
    const fixed = parseMoneyToScaled(input.fixedAmount, currencyCode, scale);
    if (fixed.units < ZERO) {
      throw new CommercialError(
        "INVALID_ADJUSTMENT_AMOUNT",
        COMMERCIAL_USER_MESSAGES.INVALID_ADJUSTMENT_AMOUNT,
        400,
        "fixedAmount"
      );
    }
    magnitude = fixed;
    configuredFixedAmount = scaledToString(fixed);
    calculationBasis = `FIXED_AMOUNT on ${input.basis} (${scaledToString(fixed)})`;
  }

  let capped = false;

  if (input.maxPercent != null && Number.isFinite(input.maxPercent)) {
    const maxRate = parseMoneyToScaled(input.maxPercent, "TMP", scale);
    const maxFromPercent = roundQuotient(
      basisAmount.units * maxRate.units,
      HUNDRED * pow10(scale),
      rounding
    );
    if (magnitude.units > maxFromPercent) {
      magnitude = { units: maxFromPercent, scale, currencyCode };
      capped = true;
      calculationBasis += ` [capped at maxPercent ${input.maxPercent}%]`;
    }
  }

  if (input.maxAmount != null && input.maxAmount !== undefined) {
    const maxAmt = parseMoneyToScaled(input.maxAmount, currencyCode, scale);
    if (magnitude.units > maxAmt.units) {
      magnitude = maxAmt;
      capped = true;
      calculationBasis += ` [capped at maxAmount ${scaledToString(maxAmt)}]`;
    }
  }

  if (
    input.direction !== ADJUSTMENT_DIRECTION_CODES.DISCOUNT &&
    input.direction !== ADJUSTMENT_DIRECTION_CODES.SURCHARGE
  ) {
    throw new CommercialError(
      "INVALID_INPUT",
      "Adjustment direction must be DISCOUNT or SURCHARGE.",
      400,
      "direction"
    );
  }

  return {
    method: input.method,
    direction: input.direction,
    basis: input.basis,
    basisAmount,
    adjustmentMagnitude: magnitude,
    percentage,
    configuredFixedAmount,
    capped,
    calculationBasis,
  };
}
