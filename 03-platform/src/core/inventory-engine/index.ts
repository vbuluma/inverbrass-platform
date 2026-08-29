/**
 * Purpose:
 * Public exports for the BP-008 inventory domain engine (IP-01 foundation).
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

export {
  INVENTORY_ADJUSTMENT_MOVEMENT_TYPES,
  INVENTORY_INBOUND_MOVEMENT_TYPES,
  INVENTORY_IP01_MOVEMENT_TYPES,
  INVENTORY_MOVEMENT_TYPES,
  INVENTORY_OPENING_MOVEMENT_TYPES,
  INVENTORY_OUTBOUND_MOVEMENT_TYPES,
} from "@/core/inventory-engine/constants";
export type { InventoryMovementType } from "@/core/inventory-engine/constants";
export {
  INVENTORY_ENGINE_ERROR_CODES,
  InventoryEngineError,
} from "@/core/inventory-engine/errors";
export type { InventoryEngineErrorCode } from "@/core/inventory-engine/errors";
export {
  absoluteInventoryQuantity,
  applyInboundQuantity,
  applyOutboundQuantity,
  compareInventoryQuantity,
  deriveAvailableQuantity,
  formatInventoryQuantity,
  isNonNegativeInventoryQuantity,
  isPositiveInventoryQuantity,
  multiplyInventoryAmount,
  subtractInventoryQuantity,
  openingStockBalance,
  parseInventoryQuantity,
  remainingInboundQuantity,
} from "@/core/inventory-engine/quantity-rules";
export {
  assertAdjustmentMovementType,
  assertInboundMovementType,
  assertIp01MovementType,
  assertOpeningStockQuantity,
  assertSaleDeductionMovementType,
  assertTransferDispatchMovementType,
  assertTransferReceiptMovementType,
  isInboundAdjustmentMovementType,
  isOpeningMovementType,
} from "@/core/inventory-engine/movement-rules";
