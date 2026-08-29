/**
 * Purpose:
 * Pure inventory-control evaluation and configuration validation.
 *
 * Implementation Package:
 * BP-008 / IP-08 – Reorder & Inventory Controls
 */

import {
  compareInventoryQuantity,
  deriveAvailableQuantity,
  formatInventoryQuantity,
  isNonNegativeInventoryQuantity,
  parseInventoryQuantity,
  subtractInventoryQuantity,
} from "@/core/inventory-engine";
import {
  INVENTORY_CONTROL_STATUSES,
  type InventoryControlStatus,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import { effectiveStockLevel } from "@/modules/inventory/services/inventory-location-rules";
import type { InventoryControlSettings } from "@/modules/inventory/types";

export function normalizeOptionalLevel(value: string | null | undefined): string | null {
  if (value === undefined || value === null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
}

export function assertNonNegativeLevel(
  value: string | null | undefined,
  field: string
): string | null {
  const normalized = normalizeOptionalLevel(value);
  if (normalized === null) {
    return null;
  }
  if (!isNonNegativeInventoryQuantity(normalized)) {
    throw new InventoryError(
      INVENTORY_ERROR_CODES.INVALID_CONTROL_CONFIGURATION,
      undefined,
      400,
      { field }
    );
  }
  return normalized;
}

export function assertOptionalDays(value: number | null | undefined, field: string): number | null {
  if (value === undefined || value === null) {
    return null;
  }
  if (!Number.isInteger(value) || value < 0) {
    throw new InventoryError(
      INVENTORY_ERROR_CODES.INVALID_CONTROL_CONFIGURATION,
      undefined,
      400,
      { field }
    );
  }
  return value;
}

export function assertControlSettings(input: {
  minimumStock?: string | null;
  reorderLevel?: string | null;
  maximumStock?: string | null;
  reorderQuantity?: string | null;
  safetyStock?: string | null;
  leadTimeDays?: number | null;
  reviewPeriodDays?: number | null;
}): InventoryControlSettings {
  const minimumStock = assertNonNegativeLevel(input.minimumStock, "minimumStock");
  const reorderLevel = assertNonNegativeLevel(input.reorderLevel, "reorderLevel");
  const maximumStock = assertNonNegativeLevel(input.maximumStock, "maximumStock");
  const reorderQuantity = assertNonNegativeLevel(input.reorderQuantity, "reorderQuantity");
  const safetyStock = assertNonNegativeLevel(input.safetyStock, "safetyStock");
  if (minimumStock && maximumStock && compareInventoryQuantity(minimumStock, maximumStock) > 0) {
    throw new InventoryError(
      INVENTORY_ERROR_CODES.INVALID_CONTROL_CONFIGURATION,
      "Minimum stock cannot be greater than maximum stock.",
      400,
      { field: "minimumStock" }
    );
  }
  if (reorderLevel && maximumStock && compareInventoryQuantity(reorderLevel, maximumStock) > 0) {
    throw new InventoryError(
      INVENTORY_ERROR_CODES.INVALID_CONTROL_CONFIGURATION,
      "The replenishment level cannot be greater than maximum stock.",
      400,
      { field: "reorderLevel" }
    );
  }
  return {
    minimumStock,
    reorderLevel,
    maximumStock,
    reorderQuantity,
    safetyStock,
    leadTimeDays: assertOptionalDays(input.leadTimeDays, "leadTimeDays"),
    reviewPeriodDays: assertOptionalDays(input.reviewPeriodDays, "reviewPeriodDays"),
  };
}

export function resolveEffectiveSettings(params: {
  item: {
    reorderLevel: string | null;
    reorderQuantity: string | null;
    minimumStockLevel: string | null;
    maximumStockLevel: string | null;
    safetyStock: string | null;
    leadTimeDays: number | null;
    reviewPeriodDays: number | null;
  };
  location?: {
    reorderLevelOverride: string | null;
    minimumStockLevelOverride: string | null;
    maximumStockLevelOverride: string | null;
    reorderQuantityOverride?: string | null;
    safetyStockOverride?: string | null;
  } | null;
}): InventoryControlSettings {
  return {
    minimumStock: effectiveStockLevel(
      params.location?.minimumStockLevelOverride,
      params.item.minimumStockLevel
    ),
    reorderLevel: effectiveStockLevel(
      params.location?.reorderLevelOverride,
      params.item.reorderLevel
    ),
    maximumStock: effectiveStockLevel(
      params.location?.maximumStockLevelOverride,
      params.item.maximumStockLevel
    ),
    reorderQuantity: effectiveStockLevel(
      params.location?.reorderQuantityOverride,
      params.item.reorderQuantity
    ),
    safetyStock: effectiveStockLevel(
      params.location?.safetyStockOverride,
      params.item.safetyStock
    ),
    leadTimeDays: params.item.leadTimeDays,
    reviewPeriodDays: params.item.reviewPeriodDays,
  };
}

export function hasConfiguredThresholds(settings: InventoryControlSettings): boolean {
  return Boolean(
    settings.minimumStock ||
      settings.reorderLevel ||
      settings.maximumStock ||
      settings.reorderQuantity ||
      settings.safetyStock
  );
}

export function protectedAvailable(available: string, safetyStock: string | null): string {
  if (!safetyStock) {
    return available;
  }
  const next = subtractInventoryQuantity(available, safetyStock);
  return compareInventoryQuantity(next, "0") < 0 ? "0" : next;
}

export function recommendedReplenishmentQuantity(
  settings: InventoryControlSettings,
  available: string
): string {
  if (settings.reorderQuantity && compareInventoryQuantity(settings.reorderQuantity, "0") > 0) {
    return settings.reorderQuantity;
  }
  if (settings.maximumStock) {
    const gap = subtractInventoryQuantity(settings.maximumStock, available);
    return compareInventoryQuantity(gap, "0") > 0 ? gap : "0";
  }
  if (settings.reorderLevel) {
    const gap = subtractInventoryQuantity(settings.reorderLevel, available);
    return compareInventoryQuantity(gap, "0") > 0 ? gap : "0";
  }
  return "0";
}

export function evaluateControlStatus(params: {
  available: string;
  settings: InventoryControlSettings;
}): InventoryControlStatus {
  const configured = hasConfiguredThresholds(params.settings);
  if (!configured) {
    return compareInventoryQuantity(params.available, "0") <= 0
      ? INVENTORY_CONTROL_STATUSES.OUT_OF_STOCK
      : INVENTORY_CONTROL_STATUSES.CONFIGURATION_MISSING;
  }
  const protectedQty = protectedAvailable(params.available, params.settings.safetyStock);
  if (compareInventoryQuantity(params.available, "0") <= 0) {
    return INVENTORY_CONTROL_STATUSES.OUT_OF_STOCK;
  }
  if (
    params.settings.reorderLevel &&
    compareInventoryQuantity(protectedQty, params.settings.reorderLevel) <= 0
  ) {
    return INVENTORY_CONTROL_STATUSES.REORDER_REQUIRED;
  }
  if (
    params.settings.minimumStock &&
    compareInventoryQuantity(protectedQty, params.settings.minimumStock) <= 0
  ) {
    return INVENTORY_CONTROL_STATUSES.LOW_STOCK;
  }
  if (
    params.settings.maximumStock &&
    compareInventoryQuantity(params.available, params.settings.maximumStock) > 0
  ) {
    return INVENTORY_CONTROL_STATUSES.OVERSTOCK;
  }
  return INVENTORY_CONTROL_STATUSES.HEALTHY;
}

export function saleableFromLedger(params: {
  onHand: string;
  reserved: string;
  expiredQuantity: string;
}): { available: string; saleableAvailable: string } {
  const available = deriveAvailableQuantity(params.onHand, params.reserved);
  const remaining = subtractInventoryQuantity(available, params.expiredQuantity);
  return {
    available,
    saleableAvailable: compareInventoryQuantity(remaining, "0") < 0 ? "0" : remaining,
  };
}

export function formatLevel(value: string | null | undefined): string {
  const parsed = parseInventoryQuantity(value ?? null);
  return parsed === null ? "0" : formatInventoryQuantity(parsed);
}
