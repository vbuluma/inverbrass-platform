/**
 * Purpose:
 * Pure validation for opening-stock recording (BR-003–BR-006, BR-011).
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { INVENTORY_MOVEMENT_TYPES } from "@/core/inventory-engine";
import { isPositiveInventoryQuantity } from "@/core/inventory-engine/quantity-rules";
import { STOCK_ITEM_TYPE_CODES } from "@/modules/inventory/constants";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import { productCannotHoldStock } from "@/modules/inventory/services/stock-item-rules";
import type {
  InventoryLocationRecord,
  InventoryMovementRecord,
  InventoryProductRef,
  StockItemLocationRecord,
  StockItemRecord,
} from "@/modules/inventory/types";

export function assertOpeningStockQuantity(quantity: string): string {
  const trimmed = quantity.trim();
  if (!isPositiveInventoryQuantity(trimmed)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.OPENING_QUANTITY_INVALID, undefined, 400, {
      field: "quantity",
    });
  }
  return trimmed;
}

export function assertCanRecordOpeningStock(input: {
  stockItem: StockItemRecord;
  product: InventoryProductRef;
  location: InventoryLocationRecord;
  config: StockItemLocationRecord | null;
  existingOpening: InventoryMovementRecord | null;
}): void {
  if (productCannotHoldStock(input.product.productTypeCode)) {
    throw new InventoryError(INVENTORY_ERROR_CODES.SERVICE_CANNOT_CREATE_STOCK);
  }
  if (input.stockItem.itemTypeCode === STOCK_ITEM_TYPE_CODES.NON_STOCK_ITEM) {
    throw new InventoryError(INVENTORY_ERROR_CODES.NON_STOCK_CANNOT_CREATE_BALANCE);
  }
  if (!input.stockItem.stockTrackingEnabled) {
    throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_TRACKING_REQUIRED);
  }
  if (input.stockItem.itemTypeCode !== STOCK_ITEM_TYPE_CODES.STOCKED_ITEM) {
    throw new InventoryError(INVENTORY_ERROR_CODES.MOVEMENT_NOT_ALLOWED);
  }
  if (!input.stockItem.baseUomId) {
    throw new InventoryError(INVENTORY_ERROR_CODES.BASE_UOM_REQUIRED);
  }
  if (!input.location.isActive) {
    throw new InventoryError(INVENTORY_ERROR_CODES.LOCATION_INACTIVE);
  }
  if (!input.config || !input.config.isActive) {
    throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_AT_LOCATION);
  }
  if (input.existingOpening) {
    throw new InventoryError(INVENTORY_ERROR_CODES.OPENING_STOCK_ALREADY_RECORDED);
  }
}

export function openingStockMovementType(): string {
  return INVENTORY_MOVEMENT_TYPES.OPENING_STOCK;
}
