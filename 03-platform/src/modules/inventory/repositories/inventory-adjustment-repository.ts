/**
 * Purpose:
 * Persist stock adjustment headers and lines.
 *
 * Implementation Package:
 * BP-008 / IP-05 – Stock Adjustments, Damage, Loss & Returns
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  inventoryAdjustment,
  inventoryAdjustmentLine,
} from "@/db/schema/inventory-adjustment";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryAdjustmentLineRepositoryPort,
  InventoryAdjustmentRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  InventoryAdjustmentInsert,
  InventoryAdjustmentLineInsert,
  InventoryAdjustmentLinePatch,
  InventoryAdjustmentLineRecord,
  InventoryAdjustmentPatch,
  InventoryAdjustmentRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapHeader(row: typeof inventoryAdjustment.$inferSelect): InventoryAdjustmentRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    documentNumber: row.documentNumber,
    status: row.status,
    adjustmentType: row.adjustmentType,
    locationId: row.locationId,
    reason: row.reason,
    notes: row.notes,
    externalReference: row.externalReference,
    originType: row.originType,
    originId: row.originId,
    originLineId: row.originLineId,
    idempotencyKey: row.idempotencyKey,
    submittedAt: row.submittedAt,
    submittedBy: row.submittedBy,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    rejectedAt: row.rejectedAt,
    rejectedBy: row.rejectedBy,
    rejectionReason: row.rejectionReason,
    postedAt: row.postedAt,
    postedBy: row.postedBy,
    cancelledAt: row.cancelledAt,
    cancelledBy: row.cancelledBy,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    version: row.version,
  };
}

function mapLine(row: typeof inventoryAdjustmentLine.$inferSelect): InventoryAdjustmentLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    headerId: row.adjustmentId,
    lineNumber: row.lineNumber,
    stockItemId: row.stockItemId,
    quantity: String(row.quantity),
    uomId: row.uomId,
    baseQuantity: String(row.baseQuantity),
    conversionFactor: String(row.conversionFactor),
    condition: row.condition,
    onHandBefore: row.onHandBefore === null ? null : String(row.onHandBefore),
    onHandAfter: row.onHandAfter === null ? null : String(row.onHandAfter),
    movementId: row.movementId,
    notes: row.notes,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export class InventoryAdjustmentRepository implements InventoryAdjustmentRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryAdjustmentInsert): Promise<InventoryAdjustmentRecord> {
    const [row] = await this.db
      .insert(inventoryAdjustment)
      .values({
        id: values.id,
        businessId: values.businessId,
        documentNumber: values.documentNumber,
        status: values.status,
        adjustmentType: values.adjustmentType,
        locationId: values.locationId,
        reason: values.reason,
        notes: values.notes,
        externalReference: values.externalReference,
        originType: values.originType,
        originId: values.originId,
        originLineId: values.originLineId,
        idempotencyKey: values.idempotencyKey,
        submittedAt: values.submittedAt,
        submittedBy: values.submittedBy,
        metadata: values.metadata,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapHeader(row);
  }

  async update(businessId: string, adjustmentId: string, patch: InventoryAdjustmentPatch) {
    const [row] = await this.db
      .update(inventoryAdjustment)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryAdjustment.businessId, businessId),
          eq(inventoryAdjustment.id, adjustmentId)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
    }
    return mapHeader(row);
  }

  async findById(businessId: string, adjustmentId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryAdjustment)
      .where(
        and(
          eq(inventoryAdjustment.businessId, businessId),
          eq(inventoryAdjustment.id, adjustmentId)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(inventoryAdjustment)
      .where(
        and(
          eq(inventoryAdjustment.businessId, businessId),
          eq(inventoryAdjustment.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryAdjustment)
      .where(eq(inventoryAdjustment.businessId, businessId))
      .orderBy(desc(inventoryAdjustment.createdAt));
    return rows.map(mapHeader);
  }
}

export class InventoryAdjustmentLineRepository implements InventoryAdjustmentLineRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryAdjustmentLineInsert): Promise<InventoryAdjustmentLineRecord> {
    const [row] = await this.db
      .insert(inventoryAdjustmentLine)
      .values({
        id: values.id,
        businessId: values.businessId,
        adjustmentId: values.headerId,
        lineNumber: values.lineNumber,
        stockItemId: values.stockItemId,
        quantity: values.quantity,
        uomId: values.uomId,
        baseQuantity: values.baseQuantity,
        conversionFactor: values.conversionFactor,
        condition: values.condition,
        onHandBefore: values.onHandBefore,
        onHandAfter: values.onHandAfter,
        movementId: values.movementId,
        notes: values.notes,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapLine(row);
  }

  async update(businessId: string, lineId: string, patch: InventoryAdjustmentLinePatch) {
    const [row] = await this.db
      .update(inventoryAdjustmentLine)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(inventoryAdjustmentLine.businessId, businessId),
          eq(inventoryAdjustmentLine.id, lineId)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
    }
    return mapLine(row);
  }

  async findById(businessId: string, lineId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryAdjustmentLine)
      .where(
        and(
          eq(inventoryAdjustmentLine.businessId, businessId),
          eq(inventoryAdjustmentLine.id, lineId)
        )
      )
      .limit(1);
    return row ? mapLine(row) : null;
  }

  async listByHeader(businessId: string, headerId: string) {
    const rows = await this.db
      .select()
      .from(inventoryAdjustmentLine)
      .where(
        and(
          eq(inventoryAdjustmentLine.businessId, businessId),
          eq(inventoryAdjustmentLine.adjustmentId, headerId)
        )
      );
    return rows.map(mapLine).sort((a, b) => a.lineNumber - b.lineNumber);
  }
}

export function createInventoryAdjustmentRepository() {
  return new InventoryAdjustmentRepository();
}

export function createInventoryAdjustmentLineRepository() {
  return new InventoryAdjustmentLineRepository();
}
