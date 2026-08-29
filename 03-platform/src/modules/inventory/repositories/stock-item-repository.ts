/**
 * Purpose:
 * Persist stock items with tenant isolation. Does not copy product master rows.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { stockItem } from "@/db/schema/stock-item";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { StockItemRepositoryPort } from "@/modules/inventory/ports";
import type { StockItemInsert, StockItemPatch, StockItemRecord } from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(row: typeof stockItem.$inferSelect): StockItemRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    productId: row.productId,
    sku: row.sku,
    barcode: row.barcode,
    stockTrackingEnabled: row.stockTrackingEnabled,
    itemTypeCode: row.itemTypeCode,
    baseUomId: row.baseUomId,
    purchaseUomId: row.purchaseUomId,
    salesUomId: row.salesUomId,
    conversionFactor: row.conversionFactor === null ? null : String(row.conversionFactor),
    reorderLevel: row.reorderLevel === null ? null : String(row.reorderLevel),
    reorderQuantity: row.reorderQuantity === null ? null : String(row.reorderQuantity),
    minimumStockLevel: row.minimumStockLevel === null ? null : String(row.minimumStockLevel),
    maximumStockLevel: row.maximumStockLevel === null ? null : String(row.maximumStockLevel),
    safetyStock: row.safetyStock === null ? null : String(row.safetyStock),
    leadTimeDays: row.leadTimeDays,
    reviewPeriodDays: row.reviewPeriodDays,
    isActive: row.isActive,
    trackingMode: row.trackingMode,
    expiryTrackingEnabled: row.expiryTrackingEnabled,
    allowExpiredFulfilment: row.allowExpiredFulfilment,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
    deletedAt: row.deletedAt,
    version: row.version,
  };
}

export class StockItemRepository implements StockItemRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: StockItemInsert): Promise<StockItemRecord> {
    try {
      const [row] = await this.db
        .insert(stockItem)
        .values({
          id: values.id,
          businessId: values.businessId,
          productId: values.productId,
          sku: values.sku,
          barcode: values.barcode,
          stockTrackingEnabled: values.stockTrackingEnabled,
          itemTypeCode: values.itemTypeCode,
          baseUomId: values.baseUomId,
          purchaseUomId: values.purchaseUomId,
          salesUomId: values.salesUomId,
          conversionFactor: values.conversionFactor,
          reorderLevel: values.reorderLevel,
          reorderQuantity: values.reorderQuantity,
          minimumStockLevel: values.minimumStockLevel,
          maximumStockLevel: values.maximumStockLevel,
          safetyStock: values.safetyStock,
          leadTimeDays: values.leadTimeDays,
          reviewPeriodDays: values.reviewPeriodDays,
          isActive: values.isActive,
          trackingMode: values.trackingMode,
          expiryTrackingEnabled: values.expiryTrackingEnabled,
          allowExpiredFulfilment: values.allowExpiredFulfilment,
          metadata: values.metadata,
          createdBy: values.createdBy,
          updatedBy: values.updatedBy,
        })
        .returning();
      if (!row) {
        throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapRow(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message.includes("stock_item_business_sku_uidx")) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_SKU, undefined, 409);
      }
      if (message.includes("stock_item_business_product_active_uidx")) {
        throw new InventoryError(INVENTORY_ERROR_CODES.DUPLICATE_STOCK_ITEM, undefined, 409);
      }
      throw error;
    }
  }

  async update(businessId: string, stockItemId: string, patch: StockItemPatch) {
    const [row] = await this.db
      .update(stockItem)
      .set({
        ...patch,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(stockItem.businessId, businessId),
          eq(stockItem.id, stockItemId),
          isNull(stockItem.deletedAt)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.STOCK_ITEM_NOT_FOUND, undefined, 404);
    }
    return mapRow(row);
  }

  async findById(businessId: string, stockItemId: string) {
    const [row] = await this.db
      .select()
      .from(stockItem)
      .where(
        and(
          eq(stockItem.businessId, businessId),
          eq(stockItem.id, stockItemId),
          isNull(stockItem.deletedAt)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findActiveByProduct(businessId: string, productId: string) {
    const [row] = await this.db
      .select()
      .from(stockItem)
      .where(
        and(
          eq(stockItem.businessId, businessId),
          eq(stockItem.productId, productId),
          eq(stockItem.isActive, true),
          isNull(stockItem.deletedAt)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async findBySku(businessId: string, sku: string) {
    const [row] = await this.db
      .select()
      .from(stockItem)
      .where(
        and(
          eq(stockItem.businessId, businessId),
          eq(stockItem.sku, sku),
          isNull(stockItem.deletedAt)
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(stockItem)
      .where(and(eq(stockItem.businessId, businessId), isNull(stockItem.deletedAt)));
    return rows.map(mapRow);
  }
}

export function createStockItemRepository() {
  return new StockItemRepository();
}
