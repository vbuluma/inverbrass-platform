/**
 * Purpose:
 * Persist stock-item location configuration with tenant isolation.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { stockItemLocation } from "@/db/schema/stock-item-location";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { StockItemLocationRepositoryPort } from "@/modules/inventory/ports";
import type {
  StockItemLocationInsert,
  StockItemLocationPatch,
  StockItemLocationRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(row: typeof stockItemLocation.$inferSelect): StockItemLocationRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    stockItemId: row.stockItemId,
    locationId: row.locationId,
    isActive: row.isActive,
    reorderLevelOverride:
      row.reorderLevelOverride === null ? null : String(row.reorderLevelOverride),
    minimumStockLevelOverride:
      row.minimumStockLevelOverride === null ? null : String(row.minimumStockLevelOverride),
    maximumStockLevelOverride:
      row.maximumStockLevelOverride === null ? null : String(row.maximumStockLevelOverride),
    reorderQuantityOverride:
      row.reorderQuantityOverride === null ? null : String(row.reorderQuantityOverride),
    safetyStockOverride:
      row.safetyStockOverride === null ? null : String(row.safetyStockOverride),
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    version: row.version,
  };
}

export class StockItemLocationRepository implements StockItemLocationRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: StockItemLocationInsert): Promise<StockItemLocationRecord> {
    const [row] = await this.db
      .insert(stockItemLocation)
      .values({
        id: values.id,
        businessId: values.businessId,
        stockItemId: values.stockItemId,
        locationId: values.locationId,
        isActive: values.isActive,
        reorderLevelOverride: values.reorderLevelOverride,
        minimumStockLevelOverride: values.minimumStockLevelOverride,
        maximumStockLevelOverride: values.maximumStockLevelOverride,
        reorderQuantityOverride: values.reorderQuantityOverride,
        safetyStockOverride: values.safetyStockOverride,
        metadata: values.metadata,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapRow(row);
  }

  async update(businessId: string, configId: string, patch: StockItemLocationPatch) {
    const [row] = await this.db
      .update(stockItemLocation)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(stockItemLocation.businessId, businessId),
          eq(stockItemLocation.id, configId),
          isNull(stockItemLocation.deletedAt)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(
        INVENTORY_ERROR_CODES.STOCK_ITEM_LOCATION_NOT_FOUND,
        undefined,
        404
      );
    }
    return mapRow(row);
  }

  async findById(businessId: string, configId: string) {
    const [row] = await this.db
      .select()
      .from(stockItemLocation)
      .where(
        and(
          eq(stockItemLocation.businessId, businessId),
          eq(stockItemLocation.id, configId),
          isNull(stockItemLocation.deletedAt)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findByItemAndLocation(businessId: string, stockItemId: string, locationId: string) {
    const [row] = await this.db
      .select()
      .from(stockItemLocation)
      .where(
        and(
          eq(stockItemLocation.businessId, businessId),
          eq(stockItemLocation.stockItemId, stockItemId),
          eq(stockItemLocation.locationId, locationId),
          isNull(stockItemLocation.deletedAt)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async listByStockItem(businessId: string, stockItemId: string) {
    const rows = await this.db
      .select()
      .from(stockItemLocation)
      .where(
        and(
          eq(stockItemLocation.businessId, businessId),
          eq(stockItemLocation.stockItemId, stockItemId),
          isNull(stockItemLocation.deletedAt)
        )
      );
    return rows.map(mapRow);
  }

  async listByLocation(businessId: string, locationId: string) {
    const rows = await this.db
      .select()
      .from(stockItemLocation)
      .where(
        and(
          eq(stockItemLocation.businessId, businessId),
          eq(stockItemLocation.locationId, locationId),
          isNull(stockItemLocation.deletedAt)
        )
      );
    return rows.map(mapRow);
  }
}

export function createStockItemLocationRepository() {
  return new StockItemLocationRepository();
}
