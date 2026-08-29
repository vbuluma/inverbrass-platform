/**
 * Purpose:
 * Persist append-only inventory movements. IP-01 writes OPENING_STOCK only.
 *
 * Implementation Package:
 * BP-008 / IP-01 – Inventory Foundation & Stock Item Master
 */

import { and, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { getDb } from "@/db/client";
import * as schema from "@/db/schema";
import { inventoryMovement } from "@/db/schema/inventory-movement";
import { INVENTORY_OPENING_MOVEMENT_TYPES } from "@/core/inventory-engine";
import { INVENTORY_ERROR_CODES, InventoryError } from "@/modules/inventory/errors";
import type { InventoryMovementRepositoryPort } from "@/modules/inventory/ports";
import type {
  InventoryMovementInsert,
  InventoryMovementRecord,
} from "@/modules/inventory/types";

type DbClient = PostgresJsDatabase<typeof schema>;

function mapRow(row: typeof inventoryMovement.$inferSelect): InventoryMovementRecord {
  return {
    id: row.id,
    businessId: row.businessId,
    stockItemId: row.stockItemId,
    locationId: row.locationId,
    movementType: row.movementType,
    quantity: String(row.quantity),
    uomId: row.uomId,
    reason: row.reason,
    occurredAt: row.occurredAt,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt,
    createdBy: row.createdBy,
  };
}

export class InventoryMovementRepository implements InventoryMovementRepositoryPort {
  constructor(private readonly db: DbClient = getDb()) {}

  async insert(values: InventoryMovementInsert): Promise<InventoryMovementRecord> {
    try {
      const [row] = await this.db
        .insert(inventoryMovement)
        .values({
          id: values.id,
          businessId: values.businessId,
          stockItemId: values.stockItemId,
          locationId: values.locationId,
          movementType: values.movementType,
          quantity: values.quantity,
          uomId: values.uomId,
          reason: values.reason,
          occurredAt: values.occurredAt,
          metadata: values.metadata,
          createdBy: values.createdBy,
        })
        .returning();
      if (!row) {
        throw new InventoryError(INVENTORY_ERROR_CODES.PROVIDER_ERROR, undefined, 500);
      }
      return mapRow(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (
        message.includes("inventory_movement_opening_uidx") ||
        message.includes("inventory_movement_opening_balance_uidx")
      ) {
        throw new InventoryError(
          INVENTORY_ERROR_CODES.OPENING_STOCK_ALREADY_RECORDED,
          undefined,
          409
        );
      }
      throw error;
    }
  }

  async findOpeningStock(businessId: string, stockItemId: string, locationId: string) {
    const [row] = await this.db
      .select()
      .from(inventoryMovement)
      .where(
        and(
          eq(inventoryMovement.businessId, businessId),
          eq(inventoryMovement.stockItemId, stockItemId),
          eq(inventoryMovement.locationId, locationId),
          inArray(inventoryMovement.movementType, [
            INVENTORY_OPENING_MOVEMENT_TYPES.OPENING_STOCK,
            INVENTORY_OPENING_MOVEMENT_TYPES.OPENING_BALANCE,
          ])
        )
      )
      .limit(1);
    return row ? mapRow(row) : null;
  }

  async listByStockItem(businessId: string, stockItemId: string) {
    const rows = await this.db
      .select()
      .from(inventoryMovement)
      .where(
        and(
          eq(inventoryMovement.businessId, businessId),
          eq(inventoryMovement.stockItemId, stockItemId)
        )
      );
    return rows.map(mapRow);
  }

  async listByLocation(businessId: string, locationId: string) {
    const rows = await this.db
      .select()
      .from(inventoryMovement)
      .where(
        and(
          eq(inventoryMovement.businessId, businessId),
          eq(inventoryMovement.locationId, locationId)
        )
      );
    return rows.map(mapRow);
  }

  async countByBusiness(businessId: string) {
    const rows = await this.db
      .select({ id: inventoryMovement.id })
      .from(inventoryMovement)
      .where(eq(inventoryMovement.businessId, businessId));
    return rows.length;
  }
}

export function createInventoryMovementRepository() {
  return new InventoryMovementRepository();
}
