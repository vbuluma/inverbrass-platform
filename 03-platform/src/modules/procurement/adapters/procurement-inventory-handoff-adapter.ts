/**
 * Purpose:
 * BP-008 inventory and future asset handoff adapters for IP-08 receipts.
 */

import type {
  ProcurementAssetHandoffPort,
  ProcurementInventoryHandoffPort,
} from "@/modules/procurement/ports";
import type {
  ProcurementAssetHandoffRequest,
  ProcurementAssetHandoffResult,
  ProcurementInventoryHandoffRequest,
  ProcurementInventoryHandoffResult,
} from "@/modules/procurement/types";

type InventoryOutcome = ProcurementInventoryHandoffResult & { idempotencyKey: string };
type AssetOutcome = ProcurementAssetHandoffResult & { idempotencyKey: string };

export class InProcessInventoryHandoffAdapter implements ProcurementInventoryHandoffPort {
  private readonly outcomes = new Map<string, InventoryOutcome>();
  failNext = false;
  movementCounter = 1;

  async processHandoff(
    request: ProcurementInventoryHandoffRequest
  ): Promise<ProcurementInventoryHandoffResult> {
    const existing = this.outcomes.get(request.idempotencyKey);
    if (existing) {
      return {
        success: existing.success,
        movementReference: existing.movementReference,
        errorMessage: existing.errorMessage,
      };
    }
    if (this.failNext) {
      this.failNext = false;
      const failed: InventoryOutcome = {
        idempotencyKey: request.idempotencyKey,
        success: false,
        movementReference: null,
        errorMessage: "BP-008 handoff unavailable",
      };
      this.outcomes.set(request.idempotencyKey, failed);
      return failed;
    }
    const reference = `INV-MOV-${String(this.movementCounter).padStart(6, "0")}`;
    this.movementCounter += 1;
    const success: InventoryOutcome = {
      idempotencyKey: request.idempotencyKey,
      success: true,
      movementReference: reference,
      errorMessage: null,
    };
    this.outcomes.set(request.idempotencyKey, success);
    return success;
  }
}

export class InProcessAssetHandoffAdapter implements ProcurementAssetHandoffPort {
  private readonly outcomes = new Map<string, AssetOutcome>();
  assetCounter = 1;

  async processHandoff(
    request: ProcurementAssetHandoffRequest
  ): Promise<ProcurementAssetHandoffResult> {
    const existing = this.outcomes.get(request.idempotencyKey);
    if (existing) {
      return {
        success: existing.success,
        handoffReference: existing.handoffReference,
        errorMessage: existing.errorMessage,
      };
    }
    const reference = `AST-HO-${String(this.assetCounter).padStart(6, "0")}`;
    this.assetCounter += 1;
    const success: AssetOutcome = {
      idempotencyKey: request.idempotencyKey,
      success: true,
      handoffReference: reference,
      errorMessage: null,
    };
    this.outcomes.set(request.idempotencyKey, success);
    return success;
  }
}

export function createInProcessInventoryHandoffAdapter() {
  return new InProcessInventoryHandoffAdapter();
}

export function createInProcessAssetHandoffAdapter() {
  return new InProcessAssetHandoffAdapter();
}
