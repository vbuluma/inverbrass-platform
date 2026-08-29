/**
 * Purpose:
 * Persist lots, tracked units, line captures, and ledger allocations.
 *
 * Implementation Package:
 * BP-008 / IP-07 – Batch, Expiry & Serial Resource Tracking
 */

import { and, desc, eq } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryLineTrace } from "@/db/schema/inventory-line-trace";
import { inventoryLot } from "@/db/schema/inventory-lot";
import { inventoryTraceAllocation } from "@/db/schema/inventory-trace-allocation";
import { inventoryTrackedUnit } from "@/db/schema/inventory-tracked-unit";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryLineTraceRepositoryPort,
  InventoryLotRepositoryPort,
  InventoryTraceAllocationRepositoryPort,
  InventoryTrackedUnitRepositoryPort,
} from "@/modules/inventory/ports";
import type {
  InventoryLineTraceInsert,
  InventoryLineTraceRecord,
  InventoryLotInsert,
  InventoryLotPatch,
  InventoryLotRecord,
  InventoryTraceAllocationInsert,
  InventoryTraceAllocationRecord,
  InventoryTrackedUnitInsert,
  InventoryTrackedUnitPatch,
  InventoryTrackedUnitRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function asDate(value: string | Date | null): string | null {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    return value;
  }
  return value.toISOString().slice(0, 10);
}

function mapLot(row: typeof inventoryLot.$inferSelect): InventoryLotRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    stockItemId: row.stockItemId,
    lotCode: row.lotCode,
    manufacturedOn: asDate(row.manufacturedOn),
    expiresOn: asDate(row.expiresOn),
    status: row.status,
    notes: row.notes,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

function mapUnit(row: typeof inventoryTrackedUnit.$inferSelect): InventoryTrackedUnitRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    stockItemId: row.stockItemId,
    unitCode: row.unitCode,
    status: row.status,
    locationId: row.locationId,
    expiresOn: asDate(row.expiresOn),
    heldSourceType: row.heldSourceType,
    heldSourceId: row.heldSourceId,
    notes: row.notes,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

function mapCapture(row: typeof inventoryLineTrace.$inferSelect): InventoryLineTraceRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceLineId: row.sourceLineId,
    stockItemId: row.stockItemId,
    lotCode: row.lotCode,
    manufacturedOn: asDate(row.manufacturedOn),
    expiresOn: asDate(row.expiresOn),
    unitCodes: Array.isArray(row.unitCodes) ? (row.unitCodes as string[]) : null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

function mapAllocation(
  row: typeof inventoryTraceAllocation.$inferSelect
): InventoryTraceAllocationRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    movementId: row.movementId,
    stockItemId: row.stockItemId,
    locationId: row.locationId,
    lotId: row.lotId,
    trackedUnitId: row.trackedUnitId,
    direction: row.direction,
    quantity: String(row.quantity),
    sourceType: row.sourceType,
    sourceId: row.sourceId,
    sourceLineId: row.sourceLineId,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class InventoryLotRepository implements InventoryLotRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryLotInsert): Promise<InventoryLotRecord> {
    try {
      const [row] = await this.db
        .insert(inventoryLot)
        .values({
          id: values.id,
          businessId: values.businessId,
          stockItemId: values.stockItemId,
          lotCode: values.lotCode,
          manufacturedOn: values.manufacturedOn,
          expiresOn: values.expiresOn,
          status: values.status,
          notes: values.notes,
          createdBy: values.createdBy,
          updatedBy: values.updatedBy,
        })
        .returning();
      if (!row) {
        throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapLot(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("inventory_lot_business_item_code_uidx")) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_LOT, undefined, 409);
      }
      throw error;
    }
  }

  async update(businessId: string, lotId: string, patch: InventoryLotPatch) {
    const [row] = await this.db
      .update(inventoryLot)
      .set({ ...patch, updatedAt: new Date() })
      .where(and(eq(inventoryLot.businessId, businessId), eq(inventoryLot.id, lotId)))
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.LOT_NOT_FOUND, undefined, 404);
    }
    return mapLot(row);
  }

  async findById(businessId: string, lotId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryLot)
      .where(and(eq(inventoryLot.businessId, businessId), eq(inventoryLot.id, lotId)))
      .limit(1);
    return row ? mapLot(row) : null;
  }

  async findByCode(businessId: string, stockItemId: string, lotCode: string) {
    const [row] = await this.db
      .select()
      .from(inventoryLot)
      .where(
        and(
          eq(inventoryLot.businessId, businessId),
          eq(inventoryLot.stockItemId, stockItemId),
          eq(inventoryLot.lotCode, lotCode)
        )
      )
      .limit(1);
    return row ? mapLot(row) : null;
  }

  async listByItem(businessId: string, stockItemId: string) {
    const rows = await this.db
      .select()
      .from(inventoryLot)
      .where(and(eq(inventoryLot.businessId, businessId), eq(inventoryLot.stockItemId, stockItemId)))
      .orderBy(desc(inventoryLot.createdAt));
    return rows.map(mapLot);
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryLot)
      .where(eq(inventoryLot.businessId, businessId))
      .orderBy(desc(inventoryLot.createdAt));
    return rows.map(mapLot);
  }
}

export class InventoryTrackedUnitRepository implements InventoryTrackedUnitRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryTrackedUnitInsert): Promise<InventoryTrackedUnitRecord> {
    try {
      const [row] = await this.db
        .insert(inventoryTrackedUnit)
        .values({
          id: values.id,
          businessId: values.businessId,
          stockItemId: values.stockItemId,
          unitCode: values.unitCode,
          status: values.status,
          locationId: values.locationId,
          expiresOn: values.expiresOn,
          heldSourceType: values.heldSourceType,
          heldSourceId: values.heldSourceId,
          notes: values.notes,
          createdBy: values.createdBy,
          updatedBy: values.updatedBy,
        })
        .returning();
      if (!row) {
        throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapUnit(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("inventory_tracked_unit_business_code_uidx")) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_TRACKED_UNIT, undefined, 409);
      }
      throw error;
    }
  }

  async update(businessId: string, unitId: string, patch: InventoryTrackedUnitPatch) {
    const [row] = await this.db
      .update(inventoryTrackedUnit)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(eq(inventoryTrackedUnit.businessId, businessId), eq(inventoryTrackedUnit.id, unitId))
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.TRACKED_UNIT_NOT_FOUND, undefined, 404);
    }
    return mapUnit(row);
  }

  async findById(businessId: string, unitId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryTrackedUnit)
      .where(
        and(eq(inventoryTrackedUnit.businessId, businessId), eq(inventoryTrackedUnit.id, unitId))
      )
      .limit(1);
    return row ? mapUnit(row) : null;
  }

  async findByCode(businessId: string, unitCode: string) {
    const [row] = await this.db
      .select()
      .from(inventoryTrackedUnit)
      .where(
        and(
          eq(inventoryTrackedUnit.businessId, businessId),
          eq(inventoryTrackedUnit.unitCode, unitCode)
        )
      )
      .limit(1);
    return row ? mapUnit(row) : null;
  }

  async listByItem(businessId: string, stockItemId: string) {
    const rows = await this.db
      .select()
      .from(inventoryTrackedUnit)
      .where(
        and(
          eq(inventoryTrackedUnit.businessId, businessId),
          eq(inventoryTrackedUnit.stockItemId, stockItemId)
        )
      )
      .orderBy(desc(inventoryTrackedUnit.createdAt));
    return rows.map(mapUnit);
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryTrackedUnit)
      .where(eq(inventoryTrackedUnit.businessId, businessId))
      .orderBy(desc(inventoryTrackedUnit.createdAt));
    return rows.map(mapUnit);
  }
}

export class InventoryLineTraceRepository implements InventoryLineTraceRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryLineTraceInsert): Promise<InventoryLineTraceRecord> {
    const [row] = await this.db
      .insert(inventoryLineTrace)
      .values({
        id: values.id,
        businessId: values.businessId,
        sourceType: values.sourceType,
        sourceId: values.sourceId,
        sourceLineId: values.sourceLineId,
        stockItemId: values.stockItemId,
        lotCode: values.lotCode,
        manufacturedOn: values.manufacturedOn,
        expiresOn: values.expiresOn,
        unitCodes: values.unitCodes,
        createdBy: values.createdBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapCapture(row);
  }

  async findBySourceLine(businessId: string, sourceType: string, sourceLineId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryLineTrace)
      .where(
        and(
          eq(inventoryLineTrace.businessId, businessId),
          eq(inventoryLineTrace.sourceType, sourceType),
          eq(inventoryLineTrace.sourceLineId, sourceLineId)
        )
      )
      .limit(1);
    return row ? mapCapture(row) : null;
  }

  async listByStockItem(businessId: string, stockItemId: string) {
    const rows = await this.db
      .select()
      .from(inventoryLineTrace)
      .where(
        and(
          eq(inventoryLineTrace.businessId, businessId),
          eq(inventoryLineTrace.stockItemId, stockItemId)
        )
      );
    return rows.map(mapCapture);
  }
}

export class InventoryTraceAllocationRepository implements InventoryTraceAllocationRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryTraceAllocationInsert): Promise<InventoryTraceAllocationRecord> {
    const [row] = await this.db
      .insert(inventoryTraceAllocation)
      .values({
        id: values.id,
        businessId: values.businessId,
        movementId: values.movementId,
        stockItemId: values.stockItemId,
        locationId: values.locationId,
        lotId: values.lotId,
        trackedUnitId: values.trackedUnitId,
        direction: values.direction,
        quantity: values.quantity,
        sourceType: values.sourceType,
        sourceId: values.sourceId,
        sourceLineId: values.sourceLineId,
        createdBy: values.createdBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapAllocation(row);
  }

  async listByMovement(businessId: string, movementId: string) {
    const rows = await this.db
      .select()
      .from(inventoryTraceAllocation)
      .where(
        and(
          eq(inventoryTraceAllocation.businessId, businessId),
          eq(inventoryTraceAllocation.movementId, movementId)
        )
      );
    return rows.map(mapAllocation);
  }

  async listByLot(businessId: string, lotId: string) {
    const rows = await this.db
      .select()
      .from(inventoryTraceAllocation)
      .where(
        and(
          eq(inventoryTraceAllocation.businessId, businessId),
          eq(inventoryTraceAllocation.lotId, lotId)
        )
      )
      .orderBy(desc(inventoryTraceAllocation.createdAt));
    return rows.map(mapAllocation);
  }

  async listByTrackedUnit(businessId: string, trackedUnitId: string) {
    const rows = await this.db
      .select()
      .from(inventoryTraceAllocation)
      .where(
        and(
          eq(inventoryTraceAllocation.businessId, businessId),
          eq(inventoryTraceAllocation.trackedUnitId, trackedUnitId)
        )
      )
      .orderBy(desc(inventoryTraceAllocation.createdAt));
    return rows.map(mapAllocation);
  }

  async listByItem(businessId: string, stockItemId: string) {
    const rows = await this.db
      .select()
      .from(inventoryTraceAllocation)
      .where(
        and(
          eq(inventoryTraceAllocation.businessId, businessId),
          eq(inventoryTraceAllocation.stockItemId, stockItemId)
        )
      );
    return rows.map(mapAllocation);
  }
}

export function createInventoryLotRepository() {
  return new InventoryLotRepository();
}

export function createInventoryTrackedUnitRepository() {
  return new InventoryTrackedUnitRepository();
}

export function createInventoryLineTraceRepository() {
  return new InventoryLineTraceRepository();
}

export function createInventoryTraceAllocationRepository() {
  return new InventoryTraceAllocationRepository();
}
