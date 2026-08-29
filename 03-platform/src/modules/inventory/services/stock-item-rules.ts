/**
 * Purpose:
 * Pure validation for stock-item master data (BR-001–BR-005, BR-013).
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import {
  PRODUCT_TYPES_THAT_CANNOT_CREATE_STOCK,
  STOCK_ITEM_TYPE_CODES,
} from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { CatalogueTypeRef, InventoryProductRef, InventoryUnitRef } from "@/modules/inventory/types";

export function normalizeSku(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

export function assertSku(sku: string): string {
  const normalized = normalizeSku(sku);
  if (!normalized) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_INPUT, undefined, 400, {
      field: "sku",
    });
  }
  return normalized;
}

export function assertItemType(
  code: string,
  types: CatalogueTypeRef[]
): CatalogueTypeRef {
  const match = types.find((row) => row.code === code && row.isActive);
  if (!match) {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_ITEM_TYPE, undefined, 400, {
      field: "itemTypeCode",
    });
  }
  return match;
}

export function assertProductRef(
  product: InventoryProductRef | null
): InventoryProductRef {
  if (!product) {
    throw new InventoryError(INVENTORY_ERROR_CODES.PRODUCT_NOT_FOUND, undefined, 404);
  }
  return product;
}

export function productCannotHoldStock(productTypeCode: string): boolean {
  return (PRODUCT_TYPES_THAT_CANNOT_CREATE_STOCK as readonly string[]).includes(
    productTypeCode
  );
}

export function assertStockedItemAllowed(product: InventoryProductRef, itemTypeCode: string) {
  if (
    itemTypeCode === STOCK_ITEM_TYPE_CODES.STOCKED_ITEM &&
    productCannotHoldStock(product.productTypeCode)
  ) {
    throw new InventoryError(INVENTORY_ERROR_CODES.SERVICE_CANNOT_CREATE_STOCK);
  }
}

export function assertValidUnit(unit: InventoryUnitRef | null, field: string): InventoryUnitRef {
  if (!unit || unit.status === "ARCHIVED") {
    throw new InventoryError(INVENTORY_ERROR_CODES.INVALID_UOM, undefined, 400, { field });
  }
  return unit;
}

export function assertBaseUom(unit: InventoryUnitRef | null): InventoryUnitRef {
  if (!unit) {
    throw new InventoryError(INVENTORY_ERROR_CODES.BASE_UOM_REQUIRED, undefined, 400, {
      field: "baseUomId",
    });
  }
  return assertValidUnit(unit, "baseUomId");
}

export function isStockedAndTracked(itemTypeCode: string, stockTrackingEnabled: boolean) {
  return itemTypeCode === STOCK_ITEM_TYPE_CODES.STOCKED_ITEM && stockTrackingEnabled;
}
