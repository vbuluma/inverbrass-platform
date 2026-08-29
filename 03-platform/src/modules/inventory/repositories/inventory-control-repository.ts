/**
 * Purpose:
 * Persist replenishment advice and control-change records.
 *
 * Implementation Package:
 * BP-008 / IP-08 – Reorder & Inventory Controls
 */

import { and, desc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryControlChange } from "@/db/schema/inventory-control-change";
import { inventoryReplenishmentAdvice } from "@/db/schema/inventory-replenishment-advice";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type {
  InventoryControlChangeInsert,
  InventoryControlChangePatch,
  InventoryControlChangeRecord,
  InventoryControlSettings,
  InventoryReplenishmentAdviceInsert,
  InventoryReplenishmentAdvicePatch,
  InventoryReplenishmentAdviceRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapAdvice(
  row: typeof inventoryReplenishmentAdvice.$inferSelect
): InventoryReplenishmentAdviceRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    stockItemId: row.stockItemId,
    locationId: row.locationId,
    adviceNumber: row.adviceNumber,
    conditionCode: row.conditionCode,
    status: row.status,
    onHand: String(row.onHand),
    reserved: String(row.reserved),
    available: String(row.available),
    saleableAvailable: String(row.saleableAvailable),
    thresholdQuantity: row.thresholdQuantity === null ? null : String(row.thresholdQuantity),
    recommendedQuantity: String(row.recommendedQuantity),
    reason: row.reason,
    acknowledgedAt: row.acknowledgedAt,
    acknowledgedBy: row.acknowledgedBy,
    closedAt: row.closedAt,
    closedBy: row.closedBy,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

function mapChange(row: typeof inventoryControlChange.$inferSelect): InventoryControlChangeRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    stockItemId: row.stockItemId,
    locationId: row.locationId,
    status: row.status,
    previousSettings: (row.previousSettings as InventoryControlSettings | null) ?? null,
    proposedSettings: row.proposedSettings as InventoryControlSettings,
    submittedBy: row.submittedBy,
    submittedAt: row.submittedAt,
    reviewedBy: row.reviewedBy,
    reviewedAt: row.reviewedAt,
    reviewReason: row.reviewReason,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
    updatedAt: row.updatedAt,
    updatedBy: row.updatedBy,
  };
}

export class InventoryReplenishmentAdviceRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryReplenishmentAdviceInsert) {
    const [row] = await this.db
      .insert(inventoryReplenishmentAdvice)
      .values({
        id: values.id,
        businessId: values.businessId,
        stockItemId: values.stockItemId,
        locationId: values.locationId,
        adviceNumber: values.adviceNumber,
        conditionCode: values.conditionCode,
        status: values.status,
        onHand: values.onHand,
        reserved: values.reserved,
        available: values.available,
        saleableAvailable: values.saleableAvailable,
        thresholdQuantity: values.thresholdQuantity,
        recommendedQuantity: values.recommendedQuantity,
        reason: values.reason,
        acknowledgedAt: values.acknowledgedAt,
        acknowledgedBy: values.acknowledgedBy,
        closedAt: values.closedAt,
        closedBy: values.closedBy,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapAdvice(row);
  }

  async update(
    businessId: string,
    adviceId: string,
    patch: InventoryReplenishmentAdvicePatch
  ) {
    const [row] = await this.db
      .update(inventoryReplenishmentAdvice)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(inventoryReplenishmentAdvice.businessId, businessId),
          eq(inventoryReplenishmentAdvice.id, adviceId)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.ADVICE_NOT_FOUND, undefined, 404);
    }
    return mapAdvice(row);
  }

  async findById(businessId: string, adviceId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryReplenishmentAdvice)
      .where(
        and(
          eq(inventoryReplenishmentAdvice.businessId, businessId),
          eq(inventoryReplenishmentAdvice.id, adviceId)
        )
      )
      .limit(1);
    return row ? mapAdvice(row) : null;
  }

  async findActive(
    businessId: string,
    stockItemId: string,
    locationId: string,
    conditionCode: string
  ) {
    const [row] = await this.db
      .select()
      .from(inventoryReplenishmentAdvice)
      .where(
        and(
          eq(inventoryReplenishmentAdvice.businessId, businessId),
          eq(inventoryReplenishmentAdvice.stockItemId, stockItemId),
          eq(inventoryReplenishmentAdvice.locationId, locationId),
          eq(inventoryReplenishmentAdvice.conditionCode, conditionCode),
          inArray(inventoryReplenishmentAdvice.status, ["OPEN", "ACKNOWLEDGED"])
        )
      )
      .limit(1);
    return row ? mapAdvice(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryReplenishmentAdvice)
      .where(eq(inventoryReplenishmentAdvice.businessId, businessId))
      .orderBy(desc(inventoryReplenishmentAdvice.createdAt));
    return rows.map(mapAdvice);
  }
}

export class InventoryControlChangeRepository {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryControlChangeInsert) {
    const [row] = await this.db
      .insert(inventoryControlChange)
      .values({
        id: values.id,
        businessId: values.businessId,
        stockItemId: values.stockItemId,
        locationId: values.locationId,
        status: values.status,
        previousSettings: values.previousSettings,
        proposedSettings: values.proposedSettings,
        submittedBy: values.submittedBy,
        submittedAt: values.submittedAt,
        reviewedBy: values.reviewedBy,
        reviewedAt: values.reviewedAt,
        reviewReason: values.reviewReason,
        createdBy: values.createdBy,
        updatedBy: values.updatedBy,
      })
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
    }
    return mapChange(row);
  }

  async update(businessId: string, changeId: string, patch: InventoryControlChangePatch) {
    const [row] = await this.db
      .update(inventoryControlChange)
      .set({ ...patch, updatedAt: new Date() })
      .where(
        and(
          eq(inventoryControlChange.businessId, businessId),
          eq(inventoryControlChange.id, changeId)
        )
      )
      .returning();
    if (!row) {
      throw new InventoryError(INVENTORY_ERROR_CODES.CONTROL_CHANGE_NOT_FOUND, undefined, 404);
    }
    return mapChange(row);
  }

  async findById(businessId: string, changeId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryControlChange)
      .where(
        and(
          eq(inventoryControlChange.businessId, businessId),
          eq(inventoryControlChange.id, changeId)
        )
      )
      .limit(1);
    return row ? mapChange(row) : null;
  }

  async listByBusiness(businessId: string) {
    const rows = await this.db
      .select()
      .from(inventoryControlChange)
      .where(eq(inventoryControlChange.businessId, businessId))
      .orderBy(desc(inventoryControlChange.createdAt));
    return rows.map(mapChange);
  }

  async listPendingByItem(businessId: string, stockItemId: string) {
    const rows = await this.db
      .select()
      .from(inventoryControlChange)
      .where(
        and(
          eq(inventoryControlChange.businessId, businessId),
          eq(inventoryControlChange.stockItemId, stockItemId),
          inArray(inventoryControlChange.status, ["DRAFT", "APPROVAL_PENDING"])
        )
      );
    return rows.map(mapChange);
  }
}

export function createInventoryReplenishmentAdviceRepository() {
  return new InventoryReplenishmentAdviceRepository();
}

export function createInventoryControlChangeRepository() {
  return new InventoryControlChangeRepository();
}
