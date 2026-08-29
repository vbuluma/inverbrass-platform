/**
 * Purpose:
 * IP-01 movement validation. Only OPENING_STOCK is permitted.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { INVENTORY_MOVEMENT_TYPES } from "@/core/inventory-engine/constants";
import {
  INVENTORY_ENGINE_ERROR_CODES,
  InventoryEngineError,
} from "@/core/inventory-engine/errors";
import { isPositiveInventoryQuantity } from "@/core/inventory-engine/quantity-rules";

export function assertIp01MovementType(movementType: string): void {
  if (movementType !== INVENTORY_MOVEMENT_TYPES.OPENING_STOCK) {
    throw new InventoryEngineError(
      INVENTORY_ENGINE_ERROR_CODES.MOVEMENT_TYPE_NOT_ALLOWED,
      "Only opening stock can be recorded at this stage."
    );
  }
}

export function assertInboundMovementType(movementType: string): void {
  if (
    movementType !== INVENTORY_MOVEMENT_TYPES.OPENING_STOCK &&
    movementType !== INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE &&
    movementType !== INVENTORY_MOVEMENT_TYPES.RECEIPT
  ) {
    throw new InventoryEngineError(
      INVENTORY_ENGINE_ERROR_CODES.MOVEMENT_TYPE_NOT_ALLOWED,
      "This stock movement type is not available yet."
    );
  }
}

export function assertSaleDeductionMovementType(movementType: string): void {
  if (movementType !== INVENTORY_MOVEMENT_TYPES.SALE_DEDUCTION) {
    throw new InventoryEngineError(
      INVENTORY_ENGINE_ERROR_CODES.MOVEMENT_TYPE_NOT_ALLOWED,
      "This stock movement type is not available yet."
    );
  }
}

export function assertAdjustmentMovementType(movementType: string): void {
  if (
    movementType !== INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT &&
    movementType !== INVENTORY_MOVEMENT_TYPES.NEGATIVE_ADJUSTMENT &&
    movementType !== INVENTORY_MOVEMENT_TYPES.DAMAGE &&
    movementType !== INVENTORY_MOVEMENT_TYPES.LOSS &&
    movementType !== INVENTORY_MOVEMENT_TYPES.CUSTOMER_RETURN &&
    movementType !== INVENTORY_MOVEMENT_TYPES.SUPPLIER_RETURN
  ) {
    throw new InventoryEngineError(
      INVENTORY_ENGINE_ERROR_CODES.MOVEMENT_TYPE_NOT_ALLOWED,
      "This stock movement type is not available yet."
    );
  }
}

export function isInboundAdjustmentMovementType(movementType: string): boolean {
  return (
    movementType === INVENTORY_MOVEMENT_TYPES.POSITIVE_ADJUSTMENT ||
    movementType === INVENTORY_MOVEMENT_TYPES.CUSTOMER_RETURN
  );
}

export function assertTransferDispatchMovementType(movementType: string): void {
  if (movementType !== INVENTORY_MOVEMENT_TYPES.TRANSFER_DISPATCH) {
    throw new InventoryEngineError(
      INVENTORY_ENGINE_ERROR_CODES.MOVEMENT_TYPE_NOT_ALLOWED,
      "This stock movement type is not a transfer dispatch."
    );
  }
}

export function assertTransferReceiptMovementType(movementType: string): void {
  if (movementType !== INVENTORY_MOVEMENT_TYPES.TRANSFER_RECEIPT) {
    throw new InventoryEngineError(
      INVENTORY_ENGINE_ERROR_CODES.MOVEMENT_TYPE_NOT_ALLOWED,
      "This stock movement type is not a transfer receipt."
    );
  }
}

export function isOpeningMovementType(movementType: string): boolean {
  return (
    movementType === INVENTORY_MOVEMENT_TYPES.OPENING_STOCK ||
    movementType === INVENTORY_MOVEMENT_TYPES.OPENING_BALANCE
  );
}

export function assertOpeningStockQuantity(quantity: string): void {
  if (!isPositiveInventoryQuantity(quantity)) {
    throw new InventoryEngineError(
      INVENTORY_ENGINE_ERROR_CODES.INVALID_QUANTITY,
      "Opening quantity must be greater than zero."
    );
  }
}
