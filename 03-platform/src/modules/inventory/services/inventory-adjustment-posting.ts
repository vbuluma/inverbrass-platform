/**
 * Purpose:
 * Post one adjustment/return line to the IP-01 inventory ledger, then
 * apply the resulting on-hand snapshot. Never overwrites on-hand.
 *
 * Implementation Package:
 * BP-008 / IP-05 – Stock Adjustments, Damage, Loss & Returns
 */

import { randomUUID } from "node:crypto";

import {
  assertAdjustmentMovementType,
  isInboundAdjustmentMovementType,
} from "@/core/inventory-engine";
import type {
  InventoryBalanceRepositoryPort,
  InventoryMovementRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  InventoryAdjustmentLineRecord,
  InventoryLocationRecord,
  InventoryMovementRecord,
  StockItemRecord,
} from "@/modules/inventory/types";

export async function postAdjustmentLineToLedger(params: {
  businessId: string;
  actorId: string | null;
  movementType: string;
  stockItem: StockItemRecord;
  location: InventoryLocationRecord;
  line: InventoryAdjustmentLineRecord;
  ledgerQuantity: string;
  ledgerUomId: string;
  conversionFactor: string;
  sourceType: string;
  sourceId: string;
  originType: string | null;
  originId: string | null;
  originLineId: string | null;
  reason: string;
  movements: InventoryMovementRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
}): Promise<InventoryMovementRecord> {
  assertAdjustmentMovementType(params.movementType);
  const inbound = isInboundAdjustmentMovementType(params.movementType);
  const movement = await params.movements.insert({
    id: randomUUID(),
    businessId: params.businessId,
    stockItemId: params.stockItem.id,
    locationId: params.location.id,
    movementType: params.movementType,
    quantity: params.ledgerQuantity,
    uomId: params.ledgerUomId,
    reason: params.reason,
    occurredAt: new Date(),
    metadata: {
      direction: inbound ? "IN" : "OUT",
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      lineId: params.line.id,
      enteredQuantity: params.line.quantity,
      enteredUomId: params.line.uomId,
      conversionFactor: params.conversionFactor,
      baseQuantity: params.ledgerQuantity,
      originType: params.originType,
      originId: params.originId,
      originLineId: params.originLineId,
      condition: params.line.condition,
    },
    createdBy: params.actorId,
  });
  if (inbound) {
    await params.balances.applyInboundOnHand(
      params.businessId,
      params.stockItem.id,
      params.location.id,
      params.ledgerQuantity,
      params.actorId
    );
  } else {
    await params.balances.applyOutboundOnHand(
      params.businessId,
      params.stockItem.id,
      params.location.id,
      params.ledgerQuantity,
      params.actorId
    );
  }
  return movement;
}
