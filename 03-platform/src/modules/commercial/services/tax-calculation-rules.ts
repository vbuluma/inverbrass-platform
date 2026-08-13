/**
 * Purpose:
 * Pure tax amount calculation (exclusive / inclusive / zero / exempt).
 * Integer-scaled money only — no floating-point monetary math.
 *
 * Implementation Package:
 * BP-005 / IP-03 – Tax Rules & Calculation
 */

import {
  TAX_TREATMENT_CODES,
  type TaxTreatmentCode,
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

function pow10(exponent: number): bigint {
  return TEN ** BigInt(exponent);
}

export function assertValidTaxRate(
  ratePercent: number,
  treatment: TaxTreatmentCode
): void {
  if (!Number.isFinite(ratePercent) || ratePercent < 0) {
    throw new CommercialError(
      "INVALID_TAX_RATE",
      COMMERCIAL_USER_MESSAGES.INVALID_TAX_RATE,
      400,
      "ratePercent",
      { ratePercent }
    );
  }
  if (
    (treatment === TAX_TREATMENT_CODES.ZERO_RATED ||
      treatment === TAX_TREATMENT_CODES.EXEMPT) &&
    ratePercent !== 0
  ) {
    throw new CommercialError(
      "INVALID_TAX_RATE",
      "ZERO_RATED and EXEMPT treatments require ratePercent = 0.",
      400,
      "ratePercent",
      { ratePercent, treatment }
    );
  }
}

export function assertValidTaxTreatment(treatment: string): asserts treatment is TaxTreatmentCode {
  const allowed = Object.values(TAX_TREATMENT_CODES) as string[];
  if (!allowed.includes(treatment)) {
    throw new CommercialError(
      "INVALID_TAX_TREATMENT",
      COMMERCIAL_USER_MESSAGES.INVALID_TAX_TREATMENT,
      400,
      "treatment",
      { treatment }
    );
  }
}

/**
 * Convert percent (e.g. 16) to rational numerator/denominator over money scale.
 * ratePercent may include decimals (e.g. 7.5) — represented at money scale.
 */
export function ratePercentToScaledRatio(
  ratePercent: number,
  scale: number = COMMERCIAL_INTERNAL_MONEY_SCALE
): { numerator: bigint; denominator: bigint } {
  const rateMoney = parseMoneyToScaled(ratePercent, "TMP", scale);
  return {
    numerator: rateMoney.units,
    denominator: HUNDRED * pow10(scale),
  };
}

function roundQuotient(
  numerator: bigint,
  denominator: bigint,
  rounding: CommercialRoundingMode
): bigint {
  if (denominator <= ZERO) {
    throw new Error("Invalid tax denominator.");
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

export type TaxCalculationBreakdown = {
  treatment: TaxTreatmentCode;
  ratePercent: number;
  /** Gross commercial amount (inclusive path input, or exclusive net+tax). */
  grossAmount: ScaledMoney;
  /** Net principal after tax extraction (inclusive) or taxable base (exclusive). */
  netPrincipalAmount: ScaledMoney;
  taxAmount: ScaledMoney;
  calculationBasis: string;
};

/**
 * Exclusive: tax = base × rate / 100; gross = base + tax
 * Inclusive: tax = gross × rate / (100 + rate); net = gross − tax
 * Zero / Exempt: tax = 0; net = base; gross = base
 */
export function calculateTaxAmount(input: {
  treatment: TaxTreatmentCode;
  ratePercent: number;
  baseAmount: string | number;
  currencyCode: string;
  roundingMode?: CommercialRoundingMode;
  scale?: number;
}): TaxCalculationBreakdown {
  assertValidTaxTreatment(input.treatment);
  assertValidTaxRate(input.ratePercent, input.treatment);

  const scale = input.scale ?? COMMERCIAL_INTERNAL_MONEY_SCALE;
  const rounding = input.roundingMode ?? "HALF_UP";
  const currencyCode = input.currencyCode.trim().toUpperCase();
  const base = parseMoneyToScaled(input.baseAmount, currencyCode, scale);

  if (
    input.treatment === TAX_TREATMENT_CODES.ZERO_RATED ||
    input.treatment === TAX_TREATMENT_CODES.EXEMPT
  ) {
    return {
      treatment: input.treatment,
      ratePercent: 0,
      grossAmount: base,
      netPrincipalAmount: base,
      taxAmount: { units: ZERO, scale, currencyCode },
      calculationBasis:
        input.treatment === TAX_TREATMENT_CODES.EXEMPT
          ? "EXEMPT — explicit zero tax"
          : "ZERO_RATED — explicit zero tax",
    };
  }

  const { numerator: rateNum, denominator: rateDen } = ratePercentToScaledRatio(
    input.ratePercent,
    scale
  );

  if (input.treatment === TAX_TREATMENT_CODES.EXCLUSIVE) {
    // tax = base * rateNum / rateDen
    const taxUnits = roundQuotient(base.units * rateNum, rateDen, rounding);
    const taxAmount: ScaledMoney = { units: taxUnits, scale, currencyCode };
    const grossAmount: ScaledMoney = {
      units: base.units + taxUnits,
      scale,
      currencyCode,
    };
    return {
      treatment: TAX_TREATMENT_CODES.EXCLUSIVE,
      ratePercent: input.ratePercent,
      grossAmount,
      netPrincipalAmount: base,
      taxAmount,
      calculationBasis: `EXCLUSIVE: taxableBase × ${input.ratePercent}% (${scaledToString(base)} × ${input.ratePercent}/100)`,
    };
  }

  // INCLUSIVE: tax = gross * rate / (100 + rate)
  // = gross * rateNum / (rateDen + rateNum)
  const inclusiveDen = rateDen + rateNum;
  const taxUnits = roundQuotient(base.units * rateNum, inclusiveDen, rounding);
  const taxAmount: ScaledMoney = { units: taxUnits, scale, currencyCode };
  const netPrincipalAmount: ScaledMoney = {
    units: base.units - taxUnits,
    scale,
    currencyCode,
  };
  return {
    treatment: TAX_TREATMENT_CODES.INCLUSIVE,
    ratePercent: input.ratePercent,
    grossAmount: base,
    netPrincipalAmount,
    taxAmount,
    calculationBasis: `INCLUSIVE: gross × ${input.ratePercent}/(100+${input.ratePercent}) (${scaledToString(base)} × ${input.ratePercent}/${100 + input.ratePercent})`,
  };
}
