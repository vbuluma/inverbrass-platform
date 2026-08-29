/**
 * Purpose:
 * Fail-closed errors for inventory movement and balance derivation.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

export const INVENTORY_ENGINE_ERROR_CODES = {
  INVALID_QUANTITY: "INVALID_QUANTITY",
  MOVEMENT_TYPE_NOT_ALLOWED: "MOVEMENT_TYPE_NOT_ALLOWED",
} as const;

export type InventoryEngineErrorCode =
  (typeof INVENTORY_ENGINE_ERROR_CODES)[keyof typeof INVENTORY_ENGINE_ERROR_CODES];

export class InventoryEngineError extends Error {
  readonly code: InventoryEngineErrorCode;

  constructor(code: InventoryEngineErrorCode, message: string) {
    super(message);
    this.name = "InventoryEngineError";
    this.code = code;
  }
}
