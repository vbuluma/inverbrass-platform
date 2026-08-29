/**
 * Purpose:
 * Post a sales deduction to the IP-01 ledger, then reduce on-hand and
 * reserved together. Reservation holds never write a ledger movement.
 *
 * Implementation Package:
 * BP-008 / IP-03 – Stock Reservation & Sales Deduction
 */

import { randomUUID } from "node:crypto";

import { assertSaleDeductionMovementType } from "@/core/inventory-engine";
import type {
  InventoryBalanceRepositoryPort,
  InventoryMovementRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  InventoryLocationRecord,
  InventoryMovementRecord,
  StockItemRecord,
} from "@/modules/inventory/types";

export async function postSaleDeductionToLedger(params: {
  businessId: string;
  actorId: string | null;
  stockItem: StockItemRecord;
  location: InventoryLocationRecord;
  ledgerQuantity: string;
  ledgerUomId: string;
  sourceType: string;
  sourceId: string;
  reservationId: string;
  fulfilmentId: string;
  salesOrderId: string | null;
  salesOrderLineId: string | null;
  reason: string | null;
  movements: InventoryMovementRepositoryPort;
  balances: InventoryBalanceRepositoryPort;
}): Promise<InventoryMovementRecord> {
  assertSaleDeductionMovementType("SALE_DEDUCTION");
  const movement = await params.movements.insert({
    id: randomUUID(),
    businessId: params.businessId,
    stockItemId: params.stockItem.id,
    locationId: params.location.id,
    movementType: "SALE_DEDUCTION",
    quantity: params.ledgerQuantity,
    uomId: params.ledgerUomId,
    reason: params.reason,
    occurredAt: new Date(),
    metadata: {
      direction: "OUT",
      sourceType: params.sourceType,
      sourceId: params.sourceId,
      reservationId: params.reservationId,
      fulfilmentId: params.fulfilmentId,
      salesOrderId: params.salesOrderId,
      salesOrderLineId: params.salesOrderLineId,
      enteredQuantity: params.ledgerQuantity,
    },
    createdBy: params.actorId,
  });
  await params.balances.applySaleDeduction(
    params.businessId,
    params.stockItem.id,
    params.location.id,
    params.ledgerQuantity,
    params.actorId
  );
  return movement;
}
