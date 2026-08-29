/**
 * Purpose:
 * Pure validation for inventory locations (BR-006, BR-014).
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  CatalogueTypeRef,
  InventoryLocationRecord,
} from "@/modules/inventory/types";

export function normalizeLocationCode(value: string): string {
  return value.trim().toUpperCase();
}

export function assertLocationCode(code: string): string {
  const normalized = normalizeLocationCode(code);
  if (!normalized) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "code",
    });
  }
  return normalized;
}

export function assertLocationName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "name",
    });
  }
  return trimmed;
}

export function assertLocationType(
  code: string,
  types: CatalogueTypeRef[]
): CatalogueTypeRef {
  const match = types.find((row) => row.code === code && row.isActive);
  if (!match) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_LOCATION_TYPE, undefined, 400, {
      field: "locationTypeCode",
    });
  }
  return match;
}

export function assertParentLocation(
  parent: InventoryLocationRecord | null,
  locationId?: string
): InventoryLocationRecord {
  if (!parent) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_PARENT_LOCATION, undefined, 400, {
      field: "parentLocationId",
    });
  }
  if (locationId && parent.id === locationId) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_PARENT_LOCATION, undefined, 400, {
      field: "parentLocationId",
    });
  }
  return parent;
}

export function effectiveStockLevel(
  override: string | null | undefined,
  globalValue: string | null | undefined
): string | null {
  if (override !== undefined && override !== null && override.trim() !== "") {
    return override;
  }
  if (globalValue !== undefined && globalValue !== null && globalValue.trim() !== "") {
    return globalValue;
  }
  return null;
}
