/**
 * Purpose:
 * Persist stock transfers with tenant isolation.
 *
 * Implementation Package:
 * BP-008 / IP-04 – Stock Transfers & Multi-Location
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryTransfer, inventoryTransferLine } from "@/db/schema/inventory-transfer";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryTransferInsert,
  InventoryTransferLineInsert,
  InventoryTransferLinePatch,
  InventoryTransferLineRecord,
  InventoryTransferPatch,
  InventoryTransferRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapTransfer(row: typeof inventoryTransfer.$inferSelect): InventoryTransferRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    transferNumber: row.transferNumber,
    status: row.status,
    sourceLocationId: row.sourceLocationId,
    destinationLocationId: row.destinationLocationId,
    reason: row.reason,
    notes: row.notes,
    requestedBy: row.requestedBy,
    requestedAt: row.requestedAt,
    approvedBy: row.approvedBy,
    approvedAt: row.approvedAt,
    rejectedBy: row.rejectedBy,
    rejectedAt: row.rejectedAt,
    rejectionReason: row.rejectionReason,
    dispatchedBy: row.dispatchedBy,
    dispatchedAt: row.dispatchedAt,
    receivedBy: row.receivedBy,
    receivedAt: row.receivedAt,
    completedAt: row.completedAt,
    cancelledBy: row.cancelledBy,
    cancelledAt: row.cancelledAt,
    cancellationReason: row.cancellationReason,
    idempotencyKey: row.idempotencyKey,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

function mapLine(row: typeof inventoryTransferLine.$inferSelect): InventoryTransferLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    transferId: row.transferId,
    lineNumber: Number(row.lineNumber),
    stockItemId: row.stockItemId,
    quantity: row.quantity,
    uomId: row.uomId,
    baseQuantity: row.baseQuantity,
    conversionFactor: row.conversionFactor,
    receivedQuantity: row.receivedQuantity,
    discrepancyQuantity: row.discrepancyQuantity,
    dispatchMovementId: row.dispatchMovementId,
    receiptMovementId: row.receiptMovementId,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export class InventoryTransferRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryTransferInsert) {
    const [row] = await this.db.insert(inventoryTransfer).values(values).returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapTransfer(row);
  }

  async update(businessId: string, transferId: string, patch: InventoryTransferPatch) {
    const [row] = await this.db
      .update(inventoryTransfer)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(inventoryTransfer.businessId, businessId), eq(inventoryTransfer.id, transferId)))
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_FOUND, undefined, 404);
    }
    return mapTransfer(row);
  }

  async findById(businessId: string, transferId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryTransfer)
      .where(and(eq(inventoryTransfer.businessId, businessId), eq(inventoryTransfer.id, transferId)))
      .limit(1);
    return row ? mapTransfer(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(inventoryTransfer)
      .where(
        and(
          eq(inventoryTransfer.businessId, businessId),
          eq(inventoryTransfer.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapTransfer(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryTransfer)
      .where(eq(inventoryTransfer.businessId, businessId))
      .orderBy(desc(inventoryTransfer.createdAt));
    return rows.map(mapTransfer);
  }

  async insertLine(values: InventoryTransferLineInsert) {
    const [row] = await this.db
      .insert(inventoryTransferLine)
      .values({ ...values, lineNumber: String(values.lineNumber) })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapLine(row);
  }

  async updateLine(businessId: string, lineId: string, patch: InventoryTransferLinePatch) {
    const { lineNumber, ...rest } = patch;
    const [row] = await this.db
      .update(inventoryTransferLine)
      .set({
        ...rest,
        ...(lineNumber !== undefined ? { lineNumber: String(lineNumber) } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(eq(inventoryTransferLine.businessId, businessId), eq(inventoryTransferLine.id, lineId))
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.TRANSFER_NOT_FOUND, undefined, 404);
    }
    return mapLine(row);
  }

  async listByHeader(businessId: string, transferId: string) {
    const rows = await this.db
      .select()
      .from(inventoryTransferLine)
      .where(
        and(
          eq(inventoryTransferLine.businessId, businessId),
          eq(inventoryTransferLine.transferId, transferId)
        )
      );
    return rows.map(mapLine);
  }

  async listOpenInTransit(businessId: string) {
    const open = await this.db
      .select({ id: inventoryTransfer.id })
      .from(inventoryTransfer)
      .where(
        and(
          eq(inventoryTransfer.businessId, businessId),
          inArray(inventoryTransfer.status, ["DISPATCHED", "IN_TRANSIT", "DISCREPANCY"])
        )
      );
    if (open.length === 0) {
      return [];
    }
    const rows = await this.db
      .select()
      .from(inventoryTransferLine)
      .where(
        and(
          eq(inventoryTransferLine.businessId, businessId),
          inArray(
            inventoryTransferLine.transferId,
            open.map((row) => row.id)
          )
        )
      );
    return rows.map(mapLine);
  }
}

export function createInventoryTransferRepository() {
  const repo = new InventoryTransferRepository();
  return {
    insert: (values: InventoryTransferInsert) => repo.insert(values),
    update: (businessId: string, transferId: string, patch: InventoryTransferPatch) =>
      repo.update(businessId, transferId, patch),
    findById: (businessId: string, transferId: string) => repo.findById(businessId, transferId),
    findByIdempotencyKey: (businessId: string, idempotencyKey: string) =>
      repo.findByIdempotencyKey(businessId, idempotencyKey),
    listByBusiness: (businessId: string) => repo.listByBusiness(businessId),
  };
}

export function createInventoryTransferLineRepository() {
  const repo = new InventoryTransferRepository();
  return {
    insert: (values: InventoryTransferLineInsert) => repo.insertLine(values),
    update: (businessId: string, lineId: string, patch: InventoryTransferLinePatch) =>
      repo.updateLine(businessId, lineId, patch),
    listByHeader: (businessId: string, transferId: string) => repo.listByHeader(businessId, transferId),
    listOpenInTransit: (businessId: string) => repo.listOpenInTransit(businessId),
  };
}
