/**
 * Purpose:
 * Quantity helpers for inventory balances. Does not value stock or convert UOM.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

const SCALE = 1000000;

export function parseInventoryQuantity(
  value: string | null | undefined
): number | null {
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

export function formatInventoryQuantity(scaled: number): string {
  const value = scaled / SCALE;
  if (Number.isInteger(value)) {
    return String(value);
  }
  return String(value);
}

export function isPositiveInventoryQuantity(value: string): boolean {
  const parsed = parseInventoryQuantity(value);
  return parsed !== null && parsed > 0;
}

export function isNonNegativeInventoryQuantity(value: string): boolean {
  const parsed = parseInventoryQuantity(value);
  return parsed !== null && parsed >= 0;
}

export function subtractInventoryQuantity(left: string, right: string): string {
  const leftScaled = parseInventoryQuantity(left) ?? 0;
  const rightScaled = parseInventoryQuantity(right) ?? 0;
  return formatInventoryQuantity(leftScaled - rightScaled);
}

export function absoluteInventoryQuantity(value: string): string {
  const parsed = parseInventoryQuantity(value) ?? 0;
  return formatInventoryQuantity(Math.abs(parsed));
}

export function compareInventoryQuantity(left: string, right: string): number {
  const a = parseInventoryQuantity(left);
  const b = parseInventoryQuantity(right);
  if (a === null || b === null) {
    return Number.NaN;
  }
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

export function deriveAvailableQuantity(onHand: string, reserved: string): string {
  const onHandScaled = parseInventoryQuantity(onHand) ?? 0;
  const reservedScaled = parseInventoryQuantity(reserved) ?? 0;
  return formatInventoryQuantity(onHandScaled - reservedScaled);
}

export function openingStockBalance(quantity: string): {
  onHand: string;
  reserved: string;
  available: string;
} {
  return {
    onHand: quantity,
    reserved: "0",
    available: deriveAvailableQuantity(quantity, "0"),
  };
}

export function applyInboundQuantity(currentOnHand: string, inboundQuantity: string): string {
  const current = parseInventoryQuantity(currentOnHand) ?? 0;
  const inbound = parseInventoryQuantity(inboundQuantity) ?? 0;
  return formatInventoryQuantity(current + inbound);
}

export function applyOutboundQuantity(currentOnHand: string, outboundQuantity: string): string {
  const current = parseInventoryQuantity(currentOnHand) ?? 0;
  const outbound = parseInventoryQuantity(outboundQuantity) ?? 0;
  return formatInventoryQuantity(current - outbound);
}

export function remainingInboundQuantity(expected: string, received: string): string {
  const expectedScaled = parseInventoryQuantity(expected) ?? 0;
  const receivedScaled = parseInventoryQuantity(received) ?? 0;
  return formatInventoryQuantity(Math.max(0, expectedScaled - receivedScaled));
}

export function multiplyInventoryAmount(quantity: string, unitCost: string): string | null {
  const qty = parseInventoryQuantity(quantity);
  const cost = parseInventoryQuantity(unitCost);
  if (qty === null || cost === null) {
    return null;
  }
  return formatInventoryQuantity(Math.round((qty * cost) / SCALE));
}
