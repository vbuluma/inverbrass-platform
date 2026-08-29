/**
 * Purpose:
 * Post transfer dispatch and receipt to the inventory ledger.
 *
 * Implementation Package:
 * BP-008 / IP-04 – Stock Transfers & Multi-Location
 */

import { randomUUID } from "node:crypto";

import {
  INVENTORY_MOVEMENT_TYPES,
  assertTransferDispatchMovementType,
  assertTransferReceiptMovementType,
} from "@/core/inventory-engine";
import type {
  InventoryBalanceRepositoryPort,
  InventoryMovementRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  InventoryLocationRecord,
  InventoryMovementRecord,
  InventoryTransferLineRecord,
  InventoryTransferRecord,
  StockItemRecord,
} from "@/modules/inventory/types";

async function insertMovement(params: {
  businessId: string;
  actorId: string | null;
  movementType: string;
  direction: "IN" | "OUT";
  stockItem: StockItemRecord;
  location: InventoryLocationRecord;
  line: InventoryTransferLineRecord;
  transfer: InventoryTransferRecord;
  ledgerQuantity: string;
  ledgerUomId: string;
  conversionFactor: string | null;
  reason: string | null;
  movements: InventoryMovementRepositoryPort;
}): Promise<InventoryMovementRecord> {
  return params.movements.insert({
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
      direction: params.direction,
      sourceType: "TRANSFER",
      sourceId: params.transfer.id,
      lineId: params.line.id,
      transferNumber: params.transfer.transferNumber,
      sourceLocationId: params.transfer.sourceLocationId,
      destinationLocationId: params.transfer.destinationLocationId,
      enteredQuantity: params.line.quantity,
      enteredUomId: params.line.uomId,
      conversionFactor: params.conversionFactor,
      baseQuantity: params.ledgerQuantity,
    },
    createdBy: params.actorId,
  });
}

export async function postTransferDispatchToLedger(params: {
  businessId: string;
  actorId: string | null;
  stockItem: StockItemRecord;
  location: InventoryLocationRecord;
  line: InventoryTransferLineRecord;
  transfer: InventoryTransferRecord;
  ledgerQuantity: string;
  ledgerUomId: string;
  conversionFactor: string | null;
  reason: string | null;
  movements: InventoryMovementRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
}): Promise<InventoryMovementRecord> {
  assertTransferDispatchMovementType(INVENTORY_MOVEMENT_TYPES.TRANSFER_DISPATCH);
  const movement = await insertMovement({
    ...params,
    movementType: INVENTORY_MOVEMENT_TYPES.TRANSFER_DISPATCH,
    direction: "OUT",
  });
  await params.balances.applyOutboundOnHand(
    params.businessId,
    params.stockItem.id,
    params.location.id,
    params.ledgerQuantity,
    params.actorId
  );
  return movement;
}

export async function postTransferReceiptToLedger(params: {
  businessId: string;
  actorId: string | null;
  stockItem: StockItemRecord;
  location: InventoryLocationRecord;
  line: InventoryTransferLineRecord;
  transfer: InventoryTransferRecord;
  ledgerQuantity: string;
  ledgerUomId: string;
  conversionFactor: string | null;
  reason: string | null;
  movements: InventoryMovementRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
}): Promise<InventoryMovementRecord> {
  assertTransferReceiptMovementType(INVENTORY_MOVEMENT_TYPES.TRANSFER_RECEIPT);
  const movement = await insertMovement({
    ...params,
    movementType: INVENTORY_MOVEMENT_TYPES.TRANSFER_RECEIPT,
    direction: "IN",
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
