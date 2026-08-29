/**
 * Purpose:
 * Post one inbound document line to the IP-01 inventory ledger, then
 * apply the resulting on-hand snapshot. Never updates quantity without
 * an append-only movement.
 *
 * Implementation Package:
 * BP-008 / IP-02 – Stock Receiving & Opening Balances
 */

import { randomUUID } from "node:crypto";

import {
  assertInboundMovementType,
  isOpeningMovementType,
} from "@/core/inventory-engine";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryBalanceRepositoryPort,
  InventoryMovementRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  InventoryInboundLineRecord,
  InventoryMovementRecord,
  InventoryLocationRecord,
  StockItemRecord,
} from "@/modules/inventory/types";

export async function postInboundLineToLedger(params: {
  businessId: string;
  actorId: string | null;
  movementType: string;
  stockItem: StockItemRecord;
  location: InventoryLocationRecord;
  line: InventoryInboundLineRecord;
  ledgerQuantity: string;
  ledgerUomId: string;
  conversionFactor: string;
  sourceType: string;
  sourceId: string;
  occurredAt: Date;
  reason: string | null;
  movements: InventoryMovementRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
}): Promise<InventoryMovementRecord> {
  assertInboundMovementType(params.movementType);
  if (isOpeningMovementType(params.movementType)) {
    const existingOpening = await params.movements.findOpeningStock(
      params.businessId,
      params.stockItem.id,
      params.location.id
    );
    if (existingOpening) {
      throw new InventoryError(INVENTORY_ERROR_CODES.OPENING_STOCK_ALREADY_RECORDED, undefined, 409);
    }
  }

  const movement = await params.movements.insert({
    id: randomUUID(),
    businessId: params.businessId,
    stockItemId: params.stockItem.id,
    locationId: params.location.id,
    movementType: params.movementType,
    quantity: params.ledgerQuantity,
    uomId: params.ledgerUomId,
    reason: params.reason,
    occurredAt: params.occurredAt,
    metadata: {
      direction: "IN",
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      lineId: params.line.id,
      enteredQuantity: params.line.quantity,
      enteredUomId: params.line.uomId,
      conversionFactor: params.conversionFactor,
      baseQuantity: params.ledgerQuantity,
      unitCost: params.line.unitCost,
      totalValue: params.line.lineTotal,
      currencyCode: params.line.currencyCode,
    },
    createdBy: params.actorId,
  });

  await params.balances.applyInboundOnHand(
    params.businessId,
    params.stockItem.id,
    params.location.id,
    params.ledgerQuantity,
    params.actorId
  );

  return movement;
}
