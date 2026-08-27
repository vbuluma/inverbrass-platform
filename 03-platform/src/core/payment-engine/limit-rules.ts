/**
 * Purpose:
 * Compare payment amounts for limit eligibility without recalculating
 * commercial totals, tax, or line prices.
 *
 * Implementation Package:
 * BP-007 / IP-01 – Payment Obligation & Provider Integration Foundation
 */

const SCALE = 1000000;

export function parsePaymentAmount(value: string | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = String(value).trim();
  if (!trimmed) {
    return null;
  }
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.round(parsed * SCALE);
}

export function comparePaymentAmount(left: string, right: string): number {
  const a = parsePaymentAmount(left);
  const b = parsePaymentAmount(right);
  if (a === null || b === null) {
    return Number.NaN;
  }
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

export function isAmountWithinConfiguredLimits(input: {
  amount: string;
  minAmount: string | null;
  maxAmount: string | null;
  transactionLimit: string | null;
}): boolean {
  const amount = parsePaymentAmount(input.amount);
  if (amount === null) {
    return false;
  }
  if (input.minAmount) {
    const min = parsePaymentAmount(input.minAmount);
    if (min !== null && amount < min) {
      return false;
    }
  }
  if (input.maxAmount) {
    const max = parsePaymentAmount(input.maxAmount);
    if (max !== null && amount > max) {
      return false;
    }
  }
  if (input.transactionLimit) {
    const cap = parsePaymentAmount(input.transactionLimit);
    if (cap !== null && amount > cap) {
      return false;
    }
  }
  return true;
}

export function currencySupported(
  currency: string,
  supported: string[] | null | undefined
): boolean {
  if (!supported || supported.length === 0) {
    return true;
  }
  const code = currency.trim().toUpperCase();
  return supported.some((item) => item.trim().toUpperCase() === code);
}

export function formatScaledPaymentAmount(scaled: number): string {
  const negative = scaled < 0;
  const absolute = Math.abs(scaled);
  const whole = Math.trunc(absolute / SCALE);
  const fraction = absolute % SCALE;
  const sign = negative ? "-" : "";
  if (fraction === 0) {
    return `${sign}${whole}`;
  }
  const fractionText = String(fraction).padStart(6, "0").replace(/0+$/, "");
  return `${sign}${whole}.${fractionText}`;
}

export function addPaymentAmounts(left: string, right: string): string {
  const a = parsePaymentAmount(left);
  const b = parsePaymentAmount(right);
  if (a === null || b === null) {
    throw new Error("Invalid payment amount.");
  }
  return formatScaledPaymentAmount(a + b);
}

export function subtractPaymentAmounts(left: string, right: string): string {
  const a = parsePaymentAmount(left);
  const b = parsePaymentAmount(right);
  if (a === null || b === null) {
    throw new Error("Invalid payment amount.");
  }
  return formatScaledPaymentAmount(a - b);
}

export function isPositivePaymentAmount(value: string): boolean {
  const parsed = parsePaymentAmount(value);
  return parsed !== null && parsed > 0;
}
