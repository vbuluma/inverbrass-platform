/**
 * Purpose:
 * Persist stocktake headers, lines, and count history.
 *
 * Implementation Package:
 * BP-008 / IP-06 – Stocktake & Inventory Reconciliation
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import {
  inventoryStocktake,
  inventoryStocktakeCount,
  inventoryStocktakeLine,
} from "@/db/schema/inventory-stocktake";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryStocktakeCountRepositoryPort,
  InventoryStocktakeLineRepositoryPort,
  InventoryStocktakeRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  InventoryStocktakeCountInsert,
  InventoryStocktakeCountRecord,
  InventoryStocktakeInsert,
  InventoryStocktakeLineInsert,
  InventoryStocktakeLinePatch,
  InventoryStocktakeLineRecord,
  InventoryStocktakePatch,
  InventoryStocktakeRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapHeader(row: typeof inventoryStocktake.$inferSelect): InventoryStocktakeRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    documentNumber: row.documentNumber,
    status: row.status,
    locationId: row.locationId,
    scopeType: row.scopeType,
    scopeGroup: row.scopeGroup,
    countedOn: row.countedOn,
    notes: row.notes,
    idempotencyKey: row.idempotencyKey,
    startedAt: row.startedAt,
    startedBy: row.startedBy,
    submittedAt: row.submittedAt,
    submittedBy: row.submittedBy,
    approvedAt: row.approvedAt,
    approvedBy: row.approvedBy,
    rejectedAt: row.rejectedAt,
    rejectedBy: row.rejectedBy,
    rejectionReason: row.rejectionReason,
    postedAt: row.postedAt,
    postedBy: row.postedBy,
    completedAt: row.completedAt,
    completedBy: row.completedBy,
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

function mapLine(row: typeof inventoryStocktakeLine.$inferSelect): InventoryStocktakeLineRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    headerId: row.stocktakeId,
    lineNumber: row.lineNumber,
    stockItemId: row.stockItemId,
    locationId: row.locationId,
    snapshotQuantity: String(row.snapshotQuantity),
    snapshotTakenAt: row.snapshotTakenAt,
    countedQuantity: row.countedQuantity === null ? null : String(row.countedQuantity),
    countedUomId: row.countedUomId,
    countedBaseQuantity:
      row.countedBaseQuantity === null ? null : String(row.countedBaseQuantity),
    conversionFactor: row.conversionFactor === null ? null : String(row.conversionFactor),
    varianceQuantity: row.varianceQuantity === null ? null : String(row.varianceQuantity),
    varianceClass: row.varianceClass,
    countStatus: row.countStatus,
    adjustmentId: row.adjustmentId,
    movementId: row.movementId,
    notes: row.notes,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

function mapCount(row: typeof inventoryStocktakeCount.$inferSelect): InventoryStocktakeCountRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    lineId: row.lineId,
    sequence: row.sequence,
    enteredQuantity: String(row.enteredQuantity),
    uomId: row.uomId,
    baseQuantity: String(row.baseQuantity),
    conversionFactor: String(row.conversionFactor),
    isRecount: row.isRecount,
    countedAt: row.countedAt,
    countedBy: row.countedBy,
    createdAt: row.createdAt,
  };
}

export class InventoryStocktakeRepository implements InventoryStocktakeRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryStocktakeInsert): Promise<InventoryStocktakeRecord> {
    const [row] = await this.db
      .insert(inventoryStocktake)
      .values({
        id: values.id,
        businessId: values.businessId,
        documentNumber: values.documentNumber,
        status: values.status,
        locationId: values.locationId,
        scopeType: values.scopeType,
        scopeGroup: values.scopeGroup,
        countedOn: values.countedOn,
        notes: values.notes,
        idempotencyKey: values.idempotencyKey,
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

  async update(businessId: string, stocktakeId: string, patch: InventoryStocktakePatch) {
    const [row] = await this.db
      .update(inventoryStocktake)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(eq(inventoryStocktake.businessId, businessId), eq(inventoryStocktake.id, stocktakeId))
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.DOCUMENT_NOT_FOUND, undefined, 404);
    }
    return mapHeader(row);
  }

  async findById(businessId: string, stocktakeId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryStocktake)
      .where(
        and(eq(inventoryStocktake.businessId, businessId), eq(inventoryStocktake.id, stocktakeId))
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async findByIdempotencyKey(businessId: string, idempotencyKey: string) {
    const [row] = await this.db
      .select()
      .from(inventoryStocktake)
      .where(
        and(
          eq(inventoryStocktake.businessId, businessId),
          eq(inventoryStocktake.idempotencyKey, idempotencyKey)
        )
      )
      .limit(1);
    return row ? mapHeader(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryStocktake)
      .where(eq(inventoryStocktake.businessId, businessId))
      .orderBy(desc(inventoryStocktake.createdAt));
    return rows.map(mapHeader);
  }
}

export class InventoryStocktakeLineRepository implements InventoryStocktakeLineRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryStocktakeLineInsert): Promise<InventoryStocktakeLineRecord> {
    const [row] = await this.db
      .insert(inventoryStocktakeLine)
      .values({
        id: values.id,
        businessId: values.businessId,
        stocktakeId: values.headerId,
        lineNumber: values.lineNumber,
        stockItemId: values.stockItemId,
        locationId: values.locationId,
        snapshotQuantity: values.snapshotQuantity,
        snapshotTakenAt: values.snapshotTakenAt,
        countedQuantity: values.countedQuantity,
        countedUomId: values.countedUomId,
        countedBaseQuantity: values.countedBaseQuantity,
        conversionFactor: values.conversionFactor,
        varianceQuantity: values.varianceQuantity,
        varianceClass: values.varianceClass,
        countStatus: values.countStatus,
        adjustmentId: values.adjustmentId,
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

  async update(businessId: string, lineId: string, patch: InventoryStocktakeLinePatch) {
    const [row] = await this.db
      .update(inventoryStocktakeLine)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(eq(inventoryStocktakeLine.businessId, businessId), eq(inventoryStocktakeLine.id, lineId))
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCKTAKE_LINE_NOT_FOUND, undefined, 404);
    }
    return mapLine(row);
  }

  async findById(businessId: string, lineId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryStocktakeLine)
      .where(
        and(eq(inventoryStocktakeLine.businessId, businessId), eq(inventoryStocktakeLine.id, lineId))
      )
      .limit(1);
    return row ? mapLine(row) : null;
  }

  async listByHeader(businessId: string, headerId: string) {
    const rows = await this.db
      .select()
      .from(inventoryStocktakeLine)
      .where(
        and(
          eq(inventoryStocktakeLine.businessId, businessId),
          eq(inventoryStocktakeLine.stocktakeId, headerId)
        )
      );
    return rows.map(mapLine).sort((a, b) => a.lineNumber - b.lineNumber);
  }
}

export class InventoryStocktakeCountRepository implements InventoryStocktakeCountRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryStocktakeCountInsert): Promise<InventoryStocktakeCountRecord> {
    const [row] = await this.db
      .insert(inventoryStocktakeCount)
      .values({
        id: values.id,
        businessId: values.businessId,
        lineId: values.lineId,
        sequence: values.sequence,
        enteredQuantity: values.enteredQuantity,
        uomId: values.uomId,
        baseQuantity: values.baseQuantity,
        conversionFactor: values.conversionFactor,
        isRecount: values.isRecount,
        countedAt: values.countedAt,
        countedBy: values.countedBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapCount(row);
  }

  async listByLine(businessId: string, lineId: string) {
    const rows = await this.db
      .select()
      .from(inventoryStocktakeCount)
      .where(
        and(
          eq(inventoryStocktakeCount.businessId, businessId),
          eq(inventoryStocktakeCount.lineId, lineId)
        )
      );
    return rows.map(mapCount).sort((a, b) => a.sequence - b.sequence);
  }
}

export function createInventoryStocktakeRepository() {
  return new InventoryStocktakeRepository();
}

export function createInventoryStocktakeLineRepository() {
  return new InventoryStocktakeLineRepository();
}

export function createInventoryStocktakeCountRepository() {
  return new InventoryStocktakeCountRepository();
}
