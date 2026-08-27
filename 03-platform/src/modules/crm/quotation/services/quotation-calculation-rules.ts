/**
 * Purpose:
 * Pure quotation arithmetic helpers — line totals, taxes, discounts, grand totals.
 *
 * Design rationale:
 * Kept separate from pricing resolution (BP-003) and lifecycle rules.
 *
 * Implementation Package:
 * BP-004 / IP-10 – Quotations & Sales Pipeline (Phase 10.2)
 */

const MONEY_SCALE = 6;

export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** MONEY_SCALE;
  return Math.round(value * factor) / factor;
}

export function calculateLineSubtotal(
  quantity: number,
  unitPrice: number
): number {
  if (quantity <= 0 || unitPrice < 0) {
    return 0;
  }
  return roundMoney(quantity * unitPrice);
}

export function calculateLineDiscountAmount(
  lineSubtotal: number,
  discountPercent?: number | null,
  discountAmount?: number | null
): number {
  if (lineSubtotal <= 0) {
    return 0;
  }

  let totalDiscount = 0;

  if (discountPercent != null && discountPercent > 0) {
    totalDiscount += roundMoney(lineSubtotal * (discountPercent / 100));
  }

  if (discountAmount != null && discountAmount > 0) {
    totalDiscount += roundMoney(discountAmount);
  }

  return roundMoney(Math.min(totalDiscount, lineSubtotal));
}

export function calculateLineTaxAmount(
  taxableAmount: number,
  taxRatePercent?: number | null
): number {
  if (taxableAmount <= 0 || taxRatePercent == null || taxRatePercent <= 0) {
    return 0;
  }
  return roundMoney(taxableAmount * (taxRatePercent / 100));
}

export function calculateLineTotal(
  lineSubtotal: number,
  discountAmount: number,
  taxAmount: number
): number {
  const net = roundMoney(lineSubtotal - discountAmount);
  return roundMoney(net + taxAmount);
}

export function sumMoney(values: number[]): number {
  return roundMoney(values.reduce((sum, value) => sum + value, 0));
}
