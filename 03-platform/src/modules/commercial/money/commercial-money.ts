/**
 * Purpose:
 * Decimal-safe monetary helpers for BP-005 commercial composition.
 * Uses integer scaled arithmetic (not IEEE binary float math).
 *
 * Aligns with CRM quotation MONEY_SCALE = 6 for intermediate precision.
 *
 * Implementation Package:
 * BP-005 / IP-02 – Price Components & Charge Composition
 */

export const COMMERCIAL_INTERNAL_MONEY_SCALE = 6;
export const COMMERCIAL_DEFAULT_PRESENTATION_SCALE = 2;

export type CommercialRoundingMode =
  | "HALF_UP"
  | "HALF_EVEN"
  | "FLOOR"
  | "CEIL"
  | "TRUNC";

export type ScaledMoney = {
  /** Integer amount in 10^-scale units */
  units: bigint;
  scale: number;
  currencyCode: string;
};

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const TEN = BigInt(10);

function pow10(exponent: number): bigint {
  return TEN ** BigInt(exponent);
}

function assertFiniteNumber(value: number, field: string): void {
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid monetary number for ${field}.`);
  }
}

export function parseMoneyToScaled(
  value: string | number,
  currencyCode: string,
  scale: number = COMMERCIAL_INTERNAL_MONEY_SCALE
): ScaledMoney {
  if (typeof value === "number") {
    assertFiniteNumber(value, "amount");
    return {
      units: roundToScaleUnits(value, scale, "HALF_UP"),
      scale,
      currencyCode: currencyCode.trim().toUpperCase(),
    };
  }

  const trimmed = value.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    throw new Error(`Invalid monetary string: ${value}`);
  }

  const negative = trimmed.startsWith("-");
  const unsigned = negative ? trimmed.slice(1) : trimmed;
  const [wholePart, fractionPart = ""] = unsigned.split(".");
  const padded = (fractionPart + "0".repeat(scale)).slice(0, scale);
  const asInt = BigInt(wholePart + padded);
  return {
    units: negative ? -asInt : asInt,
    scale,
    currencyCode: currencyCode.trim().toUpperCase(),
  };
}

export function scaledToString(money: ScaledMoney): string {
  const negative = money.units < ZERO;
  const abs = negative ? -money.units : money.units;
  const raw = abs.toString().padStart(money.scale + 1, "0");
  const whole = raw.slice(0, raw.length - money.scale) || "0";
  const fraction = raw.slice(raw.length - money.scale);
  const body = money.scale === 0 ? whole : `${whole}.${fraction}`;
  return negative ? `-${body}` : body;
}

/** Presentation number for APIs that still expose JS number (CRM-compatible). */
export function scaledToNumber(money: ScaledMoney): number {
  return Number(scaledToString(money));
}

export function assertSameCurrency(a: ScaledMoney, b: ScaledMoney): void {
  if (a.currencyCode !== b.currencyCode) {
    throw new Error(
      `Currency mismatch: ${a.currencyCode} vs ${b.currencyCode}`
    );
  }
}

export function addScaled(a: ScaledMoney, b: ScaledMoney): ScaledMoney {
  assertSameCurrency(a, b);
  if (a.scale !== b.scale) {
    throw new Error("Scale mismatch in monetary addition.");
  }
  return {
    units: a.units + b.units,
    scale: a.scale,
    currencyCode: a.currencyCode,
  };
}

export function subtractScaled(a: ScaledMoney, b: ScaledMoney): ScaledMoney {
  assertSameCurrency(a, b);
  if (a.scale !== b.scale) {
    throw new Error("Scale mismatch in monetary subtraction.");
  }
  return {
    units: a.units - b.units,
    scale: a.scale,
    currencyCode: a.currencyCode,
  };
}

export function multiplyScaledByNumber(
  money: ScaledMoney,
  factor: number,
  rounding: CommercialRoundingMode = "HALF_UP"
): ScaledMoney {
  assertFiniteNumber(factor, "factor");
  const factorScaled = parseMoneyToScaled(
    factor,
    money.currencyCode,
    money.scale
  );
  const product = money.units * factorScaled.units;
  const divisor = pow10(money.scale);
  const rounded = roundBigIntDivision(product, divisor, rounding);
  return {
    units: rounded,
    scale: money.scale,
    currencyCode: money.currencyCode,
  };
}

export function applySignedAmount(
  magnitude: ScaledMoney,
  sign: "ADD" | "SUBTRACT"
): ScaledMoney {
  if (sign === "ADD") {
    return magnitude;
  }
  return {
    units: -magnitude.units,
    scale: magnitude.scale,
    currencyCode: magnitude.currencyCode,
  };
}

export function roundScaledToPresentation(
  money: ScaledMoney,
  presentationScale: number,
  rounding: CommercialRoundingMode = "HALF_UP"
): ScaledMoney {
  if (presentationScale === money.scale) {
    return money;
  }
  if (presentationScale > money.scale) {
    const factor = pow10(presentationScale - money.scale);
    return {
      units: money.units * factor,
      scale: presentationScale,
      currencyCode: money.currencyCode,
    };
  }
  const divisor = pow10(money.scale - presentationScale);
  return {
    units: roundBigIntDivision(money.units, divisor, rounding),
    scale: presentationScale,
    currencyCode: money.currencyCode,
  };
}

function roundToScaleUnits(
  value: number,
  scale: number,
  rounding: CommercialRoundingMode
): bigint {
  const asString = value.toFixed(scale + 4);
  const parsed = parseMoneyToScaled(asString, "TMP", scale + 4);
  const divisor = pow10(4);
  return roundBigIntDivision(parsed.units, divisor, rounding);
}

function roundBigIntDivision(
  value: bigint,
  divisor: bigint,
  rounding: CommercialRoundingMode
): bigint {
  if (divisor <= ZERO) {
    throw new Error("Invalid divisor.");
  }
  const negative = value < ZERO;
  const abs = negative ? -value : value;
  const quotient = abs / divisor;
  const remainder = abs % divisor;
  if (remainder === ZERO) {
    return negative ? -quotient : quotient;
  }

  const half = divisor / TWO;
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
    case "HALF_EVEN": {
      if (
        remainder > half ||
        (remainder === half &&
          divisor % TWO === ZERO &&
          quotient % TWO === ONE)
      ) {
        bump = ONE;
      } else if (remainder === half && divisor % TWO !== ZERO) {
        bump = remainder * TWO >= divisor ? ONE : ZERO;
      }
      break;
    }
    case "HALF_UP":
    default:
      bump = remainder * TWO >= divisor ? ONE : ZERO;
      break;
  }

  const result = quotient + bump;
  return negative ? -result : result;
}

export function sumSignedComponents(
  amounts: ScaledMoney[],
  currencyCode: string,
  scale: number = COMMERCIAL_INTERNAL_MONEY_SCALE
): ScaledMoney {
  let total: ScaledMoney = {
    units: ZERO,
    scale,
    currencyCode: currencyCode.trim().toUpperCase(),
  };
  for (const amount of amounts) {
    total = addScaled(total, amount);
  }
  return total;
}

export function zeroScaled(
  currencyCode: string,
  scale: number = COMMERCIAL_INTERNAL_MONEY_SCALE
): ScaledMoney {
  return {
    units: ZERO,
    scale,
    currencyCode: currencyCode.trim().toUpperCase(),
  };
}
